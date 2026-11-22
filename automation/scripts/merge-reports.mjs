#!/usr/bin/env node
/**
 * Gộp blob report của hai pha (và các shard của CI) thành một báo cáo — `pnpm report:all` (plan ci-bao-cao §5.1).
 * Gom mọi `*.zip` trong các thư mục đã cho (đọc đệ quy) vào một thư mục tạm rồi gọi `playwright merge-reports`
 * (lệnh này chỉ đọc file `.zip` ngay trong một thư mục, không đọc thư mục con).
 *
 * Đầu ra: `playwright-report-all/index.html` + `playwright-report-all/results.json` (đọc bởi `pnpm report:summary`).
 * Dùng: node scripts/merge-reports.mjs [thư mục…]   (mặc định `blob-report`)
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const cli = require.resolve('@playwright/test/cli');

const OUT_DIR = 'playwright-report-all';
const dirs = process.argv.slice(2);
if (dirs.length === 0) dirs.push('blob-report');

/** Mọi file `.zip` dưới `dir` (đệ quy). @param {string} dir @returns {string[]} */
function findZips(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.zip'))
    .map((e) => path.join(e.parentPath, e.name));
}

const zips = dirs.flatMap(findZips);
if (zips.length === 0) {
  console.error(`Không có blob report nào trong ${dirs.join(', ')} — chạy pnpm test* trước`);
  process.exit(2);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nike-blob-'));
const seen = new Set();
for (const zip of zips) {
  // Cùng tên ở hai thư mục (vd gộp hai lần tải artifact) → thêm hậu tố để không ghi đè nhau
  let name = path.basename(zip);
  for (let i = 2; seen.has(name); i++) name = path.basename(zip, '.zip') + `-${i}.zip`;
  seen.add(name);
  fs.copyFileSync(zip, path.join(tmp, name));
}
console.log(`Gộp ${zips.length} blob report: ${[...seen].join(', ')}`);

fs.rmSync(OUT_DIR, { recursive: true, force: true });
const result = spawnSync(process.execPath, [cli, 'merge-reports', '--reporter', 'html,json', tmp], {
  stdio: ['ignore', 'inherit', 'inherit'],
  env: {
    ...process.env,
    PLAYWRIGHT_HTML_OUTPUT_DIR: OUT_DIR,
    PLAYWRIGHT_HTML_OPEN: 'never',
    PLAYWRIGHT_JSON_OUTPUT_FILE: path.join(OUT_DIR, 'results.json'),
  },
});
fs.rmSync(tmp, { recursive: true, force: true });
if (result.status !== 0) process.exit(result.status ?? 1);

for (const file of ['index.html', 'results.json']) {
  if (!fs.existsSync(path.join(OUT_DIR, file))) {
    console.error(`merge-reports không sinh ${OUT_DIR}/${file}`);
    process.exit(1);
  }
}
console.log(`Đã ghi ${OUT_DIR}/index.html và ${OUT_DIR}/results.json`);
