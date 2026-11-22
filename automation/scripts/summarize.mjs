#!/usr/bin/env node
/**
 * Bảng số liệu kiểm thử (Markdown) từ `results.json` của báo cáo gộp — `pnpm report:summary` (plan ci-bao-cao §6.1).
 * Theo project / khu vực / tag, kèm danh sách test lỗi và test chập chờn. In ra stdout; có `--out` thì ghi file;
 * có biến `GITHUB_STEP_SUMMARY` thì nối thêm vào file đó (job summary của GitHub Actions).
 * Luôn thoát 0 khi đọc được dữ liệu, kể cả khi có test đỏ (mã thoát của lần chạy do bước test quyết định).
 *
 * Dùng: node scripts/summarize.mjs [--input <json>] [--title <tên>] [--out <file>]
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { runInfo } from '../utils/report-env.js';

const { values: opts } = parseArgs({
  options: {
    input: { type: 'string', default: 'playwright-report-all/results.json' },
    title: { type: 'string', default: 'Toàn bộ' },
    out: { type: 'string' },
  },
});

if (!fs.existsSync(opts.input)) {
  console.error(`Không tìm thấy ${opts.input} — chạy pnpm report:all trước`);
  process.exit(2);
}

/** @type {any} */
const report = JSON.parse(fs.readFileSync(opts.input, 'utf8'));

const PROJECT_ORDER = ['api', 'chromium', 'firefox', 'webkit', 'mobile-chrome'];
const TAGS = ['@smoke', '@regression', '@stock', '@flow', '@mock', '@visual', '@a11y'];

/**
 * @typedef {{ file: string, line: number, title: string, tags: string[], project: string,
 *   status: 'expected' | 'unexpected' | 'flaky' | 'skipped', runs: number, duration: number, error: string }} Row
 */

/** Dòng đầu của message lỗi, bỏ mã màu và tiền tố "Error: ", tối đa 120 ký tự. @param {string | undefined} msg */
function firstLine(msg) {
  const line =
    (msg ?? '')
      // eslint-disable-next-line no-control-regex
      .replace(/\u001b\[[0-9;]*m/g, '')
      .split('\n')
      .map((l) => l.trim())
      .find(Boolean) ?? '';
  const text = line.replace(/^\w*Error:\s*/, '');
  return text.length > 120 ? `${text.slice(0, 119)}…` : text;
}

/** Một dòng cho mỗi cặp (test, project), bỏ project `setup`. @returns {Row[]} */
function collectRows() {
  /** @type {Row[]} */
  const rows = [];
  /** @param {any} suite */
  const walk = (suite) => {
    for (const spec of suite.specs ?? []) {
      for (const t of spec.tests) {
        if (t.projectName === 'setup') continue;
        const results = t.results ?? [];
        const failed = [...results].reverse().find((r) => r.error || r.errors?.length);
        rows.push({
          file: `tests/${spec.file.replace(/\\/g, '/')}`,
          line: spec.line,
          title: spec.title,
          tags: (spec.tags ?? []).map((/** @type {string} */ tag) =>
            tag.startsWith('@') ? tag : `@${tag}`
          ),
          project: t.projectName,
          status: t.status,
          runs: results.length,
          duration: results.reduce(
            (/** @type {number} */ s, /** @type {any} */ r) => s + (r.duration ?? 0),
            0
          ),
          error: firstLine(failed?.error?.message ?? failed?.errors?.[0]?.message),
        });
      }
    }
    for (const child of suite.suites ?? []) walk(child);
  };
  for (const suite of report.suites ?? []) walk(suite);
  return rows;
}

/** @param {Row[]} rows */
function count(rows) {
  const c = { total: rows.length, passed: 0, flaky: 0, failed: 0, skipped: 0, duration: 0 };
  for (const r of rows) {
    if (r.status === 'expected') c.passed++;
    else if (r.status === 'flaky') c.flaky++;
    else if (r.status === 'unexpected') c.failed++;
    else c.skipped++;
    c.duration += r.duration;
  }
  return c;
}

/** "98,7 %" hoặc "—" khi mẫu số bằng 0. @param {ReturnType<typeof count>} c */
function passRate(c) {
  const base = c.total - c.skipped;
  if (base === 0) return '—';
  return `${(((c.passed + c.flaky) / base) * 100).toFixed(1).replace('.', ',')} %`;
}

/** "45 giây", "2 phút 05 giây", "1 giờ 02 phút". @param {number} ms */
function formatDuration(ms) {
  const total = Math.round(ms / 1000);
  const pad = (/** @type {number} */ n) => String(n).padStart(2, '0');
  if (total < 60) return `${total} giây`;
  if (total < 3600) return `${Math.floor(total / 60)} phút ${pad(total % 60)} giây`;
  return `${Math.floor(total / 3600)} giờ ${pad(Math.floor((total % 3600) / 60))} phút`;
}

/** dd/MM/yyyy HH:mm theo giờ VN. @param {string | undefined} iso */
function formatStart(iso) {
  const d = iso ? new Date(iso) : new Date();
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value])
  );
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
}

/** Ô bảng Markdown: thoát `|`, bỏ xuống dòng. @param {string} s */
const cell = (s) => s.replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ');

/**
 * Nhóm theo khoá, giữ thứ tự `order` trước rồi tới các khoá khác theo bảng chữ cái.
 * @param {Row[]} rows @param {(r: Row) => string} key @param {string[]} [order]
 */
function groupBy(rows, key, order = []) {
  /** @type {Map<string, Row[]>} */
  const map = new Map();
  for (const r of rows) {
    const k = key(r);
    if (!map.has(k)) map.set(k, []);
    /** @type {Row[]} */ (map.get(k)).push(r);
  }
  const rank = (/** @type {string} */ k) => (order.includes(k) ? order.indexOf(k) : order.length);
  return [...map.entries()].sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b));
}

const rows = collectRows();
const run = runInfo();
const lines = [];

lines.push(`## Kết quả kiểm thử — ${opts.title}`, '');
lines.push(
  `${run.runner} · nhánh \`${run.branch}\` · commit \`${run.commit}\` · ${formatStart(report.stats?.startTime)} (giờ VN) · ${formatDuration(report.stats?.duration ?? 0)}`,
  ''
);

lines.push('### Theo project', '');
lines.push('| Project | Tổng | Đạt | Chập chờn | Lỗi | Bỏ qua | Tỉ lệ đạt | Thời gian chạy test |');
lines.push('|---|---|---|---|---|---|---|---|');
const projectRow = (/** @type {string} */ name, /** @type {ReturnType<typeof count>} */ c) =>
  `| ${name} | ${c.total} | ${c.passed} | ${c.flaky} | ${c.failed} | ${c.skipped} | ${passRate(c)} | ${formatDuration(c.duration)} |`;
for (const [project, list] of groupBy(rows, (r) => r.project, PROJECT_ORDER)) {
  lines.push(projectRow(project, count(list)));
}
lines.push(projectRow('**Tổng**', count(rows)), '');

const smallRow = (/** @type {string} */ name, /** @type {ReturnType<typeof count>} */ c) =>
  `| ${name} | ${c.total} | ${c.passed} | ${c.flaky} | ${c.failed} | ${c.skipped} |`;

lines.push('### Theo khu vực', '');
lines.push('| Khu vực | Tổng | Đạt | Chập chờn | Lỗi | Bỏ qua |', '|---|---|---|---|---|---|');
for (const [area, list] of groupBy(rows, (r) =>
  path.posix.dirname(r.file).split('/').slice(0, 2).join('/')
)) {
  lines.push(smallRow(area, count(list)));
}
lines.push('');

lines.push('### Theo tag', '');
lines.push('| Tag | Tổng | Đạt | Chập chờn | Lỗi | Bỏ qua |', '|---|---|---|---|---|---|');
for (const tag of TAGS) lines.push(smallRow(tag, count(rows.filter((r) => r.tags.includes(tag)))));
lines.push('');

const testName = (/** @type {Row} */ r) => `\`${r.file}:${r.line}\` ${cell(r.title)}`;
const failed = rows.filter((r) => r.status === 'unexpected');
if (failed.length > 0) {
  lines.push(`### Test lỗi (${failed.length})`, '');
  lines.push('| Test | Project | Lỗi |', '|---|---|---|');
  for (const r of failed) lines.push(`| ${testName(r)} | ${r.project} | ${cell(r.error)} |`);
  lines.push('');
}
const flaky = rows.filter((r) => r.status === 'flaky');
if (flaky.length > 0) {
  lines.push(`### Test chập chờn (${flaky.length})`, '');
  lines.push('| Test | Project | Số lần chạy |', '|---|---|---|');
  for (const r of flaky) lines.push(`| ${testName(r)} | ${r.project} | ${r.runs} |`);
  lines.push('');
}

const markdown = lines.join('\n');
process.stdout.write(markdown);
if (opts.out) {
  fs.mkdirSync(path.dirname(path.resolve(opts.out)), { recursive: true });
  fs.writeFileSync(opts.out, markdown);
}
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
}
