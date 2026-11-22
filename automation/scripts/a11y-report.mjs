#!/usr/bin/env node
/**
 * Bảng vi phạm khả năng truy cập (plan kiem-thu-giao-dien §5.1, §6.3) — `pnpm report:a11y`.
 * Đọc `a11y-results/**\/*.json` (do `utils/a11y.js` ghi, mỗi file một lần quét), in bảng Markdown theo
 * trang × thiết bị × rule. Lần quét chứng minh (`demo: true`, TC-31) không tính.
 *
 * Dùng: node scripts/a11y-report.mjs [--input a11y-results] [--title <tên>] [--out <file>]
 *   --out: ghi thêm ra file; có biến GITHUB_STEP_SUMMARY thì nối vào job summary.
 * Thoát 0 khi đọc được dữ liệu (kể cả có vi phạm); 2 khi không có kết quả.
 */
import fs from 'node:fs';
import path from 'node:path';

const KNOWN_FILE = new URL('../data/a11y-known.json', import.meta.url);
const IMPACT_ORDER = ['critical', 'serious', 'moderate', 'minor'];
const BLOCKING = new Set(['critical', 'serious']);
const DEVICE = { chromium: 'desktop', 'mobile-chrome': 'mobile' };

/** @param {string} name */
function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const input = arg('--input') ?? 'a11y-results';
const title = arg('--title') ?? 'Toàn bộ';
const out = arg('--out');

/** @param {string} dir @returns {string[]} */
function jsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return jsonFiles(p);
    return e.name.endsWith('.json') ? [p] : [];
  });
}

/**
 * @typedef {{ page: string, project: string, rule: string, impact: string | null, nodes: number,
 *   targets: string[], help: string, helpUrl: string, known: string | null }} Row
 * @typedef {{ page: string, project: string, demo?: boolean, violations: Row[] }} Scan
 */

/** Một lần quét mỗi (project, trang); file trùng (vd nhiều shard) lấy file đọc sau. @type {Map<string, Scan>} */
const scans = new Map();
for (const file of jsonFiles(input)) {
  /** @type {Scan} */
  const scan = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!scan.page || !scan.project || scan.demo) continue;
  scans.set(`${scan.project}|${scan.page}`, scan);
}
if (scans.size === 0) {
  console.error(`Không có kết quả a11y trong ${input} — chạy pnpm test:a11y trước`);
  process.exit(2);
}

const device = (/** @type {string} */ project) =>
  DEVICE[/** @type {keyof typeof DEVICE} */ (project)] ?? project;
const status = (/** @type {Row} */ r) =>
  r.known ? 'known' : BLOCKING.has(r.impact ?? '') ? 'blocking' : 'warning';

const rows = [...scans.values()].flatMap((s) => s.violations);
rows.sort(
  (a, b) =>
    IMPACT_ORDER.indexOf(a.impact ?? '') - IMPACT_ORDER.indexOf(b.impact ?? '') ||
    a.page.localeCompare(b.page) ||
    device(a.project).localeCompare(device(b.project)) ||
    a.rule.localeCompare(b.rule)
);
const count = (/** @type {string} */ s) => rows.filter((r) => status(r) === s).length;
const pageNames = [...new Set([...scans.values()].map((s) => s.page))].sort();

const lines = [
  `## Khả năng truy cập (WCAG 2.1 AA) — ${title}`,
  '',
  `${scans.size} lần quét · ${pageNames.length} trang / trạng thái · chặn ${count('blocking')} · ` +
    `chấp nhận ${count('known')} · cảnh báo ${count('warning')}`,
  '',
];
if (rows.length === 0) {
  lines.push('Không có vi phạm.');
} else {
  lines.push(
    '| Trang / trạng thái | Thiết bị | Rule | Mức | Phần tử | Trạng thái |',
    '|---|---|---|---|---|---|'
  );
  for (const r of rows) {
    const s = status(r);
    const label =
      s === 'blocking' ? '**chặn**' : s === 'known' ? `chấp nhận — ${r.known}` : 'cảnh báo';
    lines.push(
      `| ${r.page} | ${device(r.project)} | ${r.rule} | ${r.impact} | ${r.nodes} | ${label} |`
    );
  }
}

// Trang sạch: gộp thiết bị; sạch ở một phần thiết bị thì ghi kèm thiết bị đó.
const clean = pageNames.flatMap((name) => {
  const ofPage = [...scans.values()].filter((s) => s.page === name);
  const cleanOn = ofPage.filter((s) => s.violations.length === 0).map((s) => device(s.project));
  if (cleanOn.length === 0) return [];
  return [cleanOn.length === ofPage.length ? name : `${name} (${cleanOn.sort().join(', ')})`];
});
lines.push('', `### Trang không có vi phạm (${clean.length})`, clean.join(', ') || '—');

/** @type {{ rule: string, pages: string[], reason: string }[]} */
const knownItems = JSON.parse(fs.readFileSync(KNOWN_FILE, 'utf8')).items;
const unused = knownItems.filter(
  (k) =>
    !rows.some(
      (r) =>
        r.rule === k.rule &&
        r.known === k.reason &&
        (k.pages.includes('*') || k.pages.includes(r.page))
    )
);
if (unused.length > 0) {
  lines.push('', `### Mục chấp nhận không còn gặp (${unused.length})`);
  for (const k of unused)
    lines.push(`- ${k.rule} ở ${k.pages.join(', ')} — xoá khỏi data/a11y-known.json`);
}

const markdown = `${lines.join('\n')}\n`;
process.stdout.write(markdown);
if (out) {
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, markdown);
}
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
}
