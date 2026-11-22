#!/usr/bin/env node
/**
 * Kiểm quy tắc tag + ID của bộ test (plan kiem-thu-hoi-quy §6.3) — `pnpm check:tags`.
 * Đọc `playwright test --list --reporter=json` của cả hai pha (thường / `@stock`), không chạy test.
 *
 * Lỗi (thoát 1, in `file:dòng — lý do`):
 *   1. test (trừ project `setup`) không có đúng một trong `@smoke` / `@regression`;
 *   2. tiêu đề không bắt đầu bằng ID `TC-\d{2}[a-z]?`;
 *   3. trùng ID trong một file ở nhiều dòng khác nhau (ca data-driven sinh từ cùng một dòng thì được);
 *   6. test trong `tests/visual/` thiếu `@visual`, hoặc trong `tests/a11y/` thiếu `@a11y`;
 *   7. `@visual` / `@a11y` dùng ngoài hai thư mục đó (plan kiem-thu-giao-dien §5.6).
 * Cảnh báo (không đổi mã thoát):
 *   4. thân test có thao tác tạo đơn (`order.create(`, `placeOrder.click(`) mà test nằm ở pha thường;
 *   5. file có > 3 test `@smoke` (ca data-driven cùng dòng tính 1).
 * In thêm bảng thống kê theo file và theo project: tổng / smoke / regression / stock / flow / mock / visual / a11y.
 *
 * Dùng: node scripts/check-tags.mjs [--quiet]   (--quiet: không in bảng thống kê)
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const cli = require.resolve('@playwright/test/cli');
const quiet = process.argv.includes('--quiet');

const ID_RE = /^(TC-\d{2}[a-z]?)(?:\s|$)/;
const LEVELS = ['smoke', 'regression'];
const CREATE_TOKENS = ['order.create(', 'placeOrder.click('];
const SMOKE_PER_FILE = 3;
/** Tag gắn với thư mục cùng tên (rule 6, 7). */
const DIR_TAGS = ['visual', 'a11y'];
const STAT_TAGS = ['smoke', 'regression', 'stock', 'flow', 'mock', ...DIR_TAGS];

/**
 * @typedef {{ title: string, file: string, line: number, tags: string[], project: string, phase: string }} Entry
 */

/** Danh sách test của một pha. @param {'main' | 'stock'} phase @returns {{ entries: Entry[], rootDir: string }} */
function listPhase(phase) {
  const res = spawnSync(process.execPath, [cli, 'test', '--list', '--reporter=json'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, E2E_STOCK: phase === 'stock' ? '1' : '', E2E_SKIP_WEBSERVER: '1' },
  });
  if (res.status !== 0 && !res.stdout) {
    console.error(res.stderr);
    process.exit(2);
  }
  const report = JSON.parse(res.stdout);
  if (report.errors?.length) {
    for (const e of report.errors) console.error(e.message ?? e);
    process.exit(2);
  }
  /** @type {Entry[]} */
  const entries = [];
  /** @param {any} suite */
  const walk = (suite) => {
    for (const spec of suite.specs ?? []) {
      for (const t of spec.tests) {
        entries.push({
          title: spec.title,
          file: spec.file,
          line: spec.line,
          tags: spec.tags,
          project: t.projectName,
          phase,
        });
      }
    }
    for (const child of suite.suites ?? []) walk(child);
  };
  report.suites.forEach(walk);
  return { entries, rootDir: report.config.rootDir };
}

const main = listPhase('main');
const stock = listPhase('stock');
const rootDir = main.rootDir;
const all = [...main.entries, ...stock.entries].filter((e) => e.project !== 'setup');

/** @type {Map<string, string>} khoá `file:dòng` → lý do (một lỗi mỗi chỗ mỗi lý do) */
const errors = new Map();
/** @type {Map<string, string>} */
const warnings = new Map();
const where = (/** @type {Entry} */ e) => `tests/${e.file}:${e.line}`;

for (const e of all) {
  const levels = LEVELS.filter((l) => e.tags.includes(l));
  if (levels.length !== 1) {
    errors.set(
      `${where(e)} — tag`,
      levels.length === 0
        ? 'thiếu tag @smoke / @regression'
        : 'có cả @smoke lẫn @regression (chỉ được một)'
    );
  }
  if (!ID_RE.test(e.title)) {
    errors.set(`${where(e)} — id`, `tiêu đề không bắt đầu bằng ID TC-xx: "${e.title}"`);
  }
}

// 6, 7. Tag @visual / @a11y đúng thư mục
for (const e of all) {
  const file = e.file.replaceAll('\\', '/');
  for (const tag of DIR_TAGS) {
    const inDir = file.startsWith(`${tag}/`);
    if (inDir && !e.tags.includes(tag)) {
      errors.set(`${where(e)} — ${tag}`, `test trong tests/${tag}/ thiếu tag @${tag}`);
    } else if (!inDir && e.tags.includes(tag)) {
      errors.set(`${where(e)} — ${tag}`, `@${tag} chỉ dùng cho test trong tests/${tag}/`);
    }
  }
}

// 3. Trùng ID ở nhiều dòng trong một file
/** @type {Map<string, Set<number>>} */
const idLines = new Map();
for (const e of all) {
  const id = e.title.match(ID_RE)?.[1];
  if (!id) continue;
  const key = `${e.file}|${id}`;
  if (!idLines.has(key)) idLines.set(key, new Set());
  /** @type {Set<number>} */ (idLines.get(key)).add(e.line);
}
for (const [key, lines] of idLines) {
  if (lines.size < 2) continue;
  const [file, id] = key.split('|');
  const sorted = [...lines].sort((a, b) => a - b);
  for (const line of sorted.slice(1)) {
    errors.set(
      `tests/${file}:${line} — dup`,
      `trùng ID ${id} với dòng ${sorted[0]} (không phải ca data-driven)`
    );
  }
}

// 4. Thao tác tạo đơn trong test ở pha thường (tĩnh: gán dòng chứa token cho test bắt đầu gần nhất phía trên)
/** @type {Map<string, Entry[]>} */
const byFile = new Map();
for (const e of all) {
  if (!byFile.has(e.file)) byFile.set(e.file, []);
  /** @type {Entry[]} */ (byFile.get(e.file)).push(e);
}
for (const [file, entries] of byFile) {
  const source = fs.readFileSync(path.join(rootDir, file), 'utf8').split(/\r?\n/);
  const starts = [...new Set(entries.map((e) => e.line))].sort((a, b) => a - b);
  source.forEach((text, i) => {
    if (!CREATE_TOKENS.some((t) => text.includes(t))) return;
    const lineNo = i + 1;
    const owner = starts.filter((s) => s <= lineNo).pop();
    if (owner === undefined) return; // hàm dùng chung ngoài test
    const inMain = entries.some((e) => e.line === owner && e.phase === 'main');
    if (inMain) {
      warnings.set(
        `tests/${file}:${lineNo} — stock`,
        `test ở dòng ${owner} có thao tác tạo đơn nhưng nằm ngoài describe @stock (kiểm lại nếu không phải request bị mock)`
      );
    }
  });
}

// 5. Quá nhiều @smoke trong một file
for (const [file, entries] of byFile) {
  const smokeLines = new Set(entries.filter((e) => e.tags.includes('smoke')).map((e) => e.line));
  if (smokeLines.size > SMOKE_PER_FILE) {
    warnings.set(
      `tests/${file} — smoke`,
      `${smokeLines.size} test @smoke (ngưỡng ≤ ${SMOKE_PER_FILE}): dòng ${[...smokeLines].sort((a, b) => a - b).join(', ')}`
    );
  }
}

/** Bảng thống kê. @param {string} label @param {(e: Entry) => string} keyOf */
function table(label, keyOf) {
  /** @type {Map<string, Record<string, number>>} */
  const rows = new Map();
  for (const e of all) {
    const key = keyOf(e);
    if (!rows.has(key)) {
      rows.set(key, Object.fromEntries(['total', ...STAT_TAGS].map((c) => [c, 0])));
    }
    const r = /** @type {Record<string, number>} */ (rows.get(key));
    r.total += 1;
    for (const tag of STAT_TAGS) {
      if (e.tags.includes(tag)) r[tag] += 1;
    }
  }
  const cols = ['total', ...STAT_TAGS];
  const keys = [...rows.keys()].sort();
  const width = Math.max(label.length, ...keys.map((k) => k.length));
  const sum = Object.fromEntries(cols.map((c) => [c, 0]));
  console.log(`\n${label.padEnd(width)}  ${cols.map((c) => c.padStart(11)).join('')}`);
  for (const k of keys) {
    const r = /** @type {Record<string, number>} */ (rows.get(k));
    for (const c of cols) sum[c] += r[c];
    console.log(`${k.padEnd(width)}  ${cols.map((c) => String(r[c]).padStart(11)).join('')}`);
  }
  console.log(`${'TỔNG'.padEnd(width)}  ${cols.map((c) => String(sum[c]).padStart(11)).join('')}`);
}

if (!quiet) {
  table('file', (e) => `tests/${e.file}`);
  table('project', (e) => e.project);
}

for (const [key, msg] of warnings) console.log(`CẢNH BÁO ${key.replace(/ — \w+$/, '')} — ${msg}`);
for (const [key, msg] of errors) console.log(`LỖI ${key.replace(/ — \w+$/, '')} — ${msg}`);
console.log(`\ncheck-tags: ${all.length} test, ${errors.size} lỗi, ${warnings.size} cảnh báo`);
process.exit(errors.size > 0 ? 1 : 0);
