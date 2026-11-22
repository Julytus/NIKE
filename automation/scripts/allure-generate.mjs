#!/usr/bin/env node
/**
 * Sinh báo cáo Allure có lịch sử (biểu đồ Trend) — `pnpm allure:generate` (plan ci-bao-cao §5.1).
 *   1. chép `allure-report/history/` (của lần sinh trước, hoặc cache của CI) → `allure-results/history/`;
 *   2. ghi `allure-results/executor.json` (máy local / GitHub Actions, §6.3);
 *      đánh dấu `statusDetails.flaky` cho test đỏ rồi xanh khi retry (allure-playwright không tự gắn, mà nhóm
 *      "Test chập chờn" của `allure/categories.json` cần cờ này);
 *   3. `allure generate allure-results --clean -o allure-report`;
 *   4. có `--single-file`: sinh thêm `allure-report-single/index.html` (một file, mở thẳng bằng file://).
 * `--clean` của Allure xoá cả `allure-report/history/`, nên phải chép lịch sử ra trước (bước 1).
 *
 * Dùng: node scripts/allure-generate.mjs [--single-file] [--title <tên báo cáo>]   (mặc định "Toàn bộ")
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { executorInfo } from '../utils/report-env.js';

const require = createRequire(import.meta.url);
/** @type {(args: string[]) => import('node:child_process').ChildProcess} */
const allure = require('allure-commandline');

const RESULTS = 'allure-results';
const REPORT = 'allure-report';
const SINGLE = 'allure-report-single';

const { values: opts } = parseArgs({
  options: {
    'single-file': { type: 'boolean', default: false },
    title: { type: 'string', default: 'Toàn bộ' },
  },
});

const hasResults =
  fs.existsSync(RESULTS) && fs.readdirSync(RESULTS).some((f) => f.endsWith('-result.json'));
if (!hasResults) {
  console.error(`${RESULTS}/ trống — chạy pnpm test* trước`);
  process.exit(2);
}

// Allure dùng JAVA_HOME nếu có, không thì `java` trong PATH (giống script dist/bin/allure)
const java = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', 'java') : 'java';
const javaCheck = spawnSync(java, ['-version'], { stdio: 'ignore' });
if (javaCheck.error || javaCheck.status !== 0) {
  console.error('Cần Java 21 để sinh báo cáo Allure (kiểm bằng java -version)');
  process.exit(2);
}

const historyFrom = path.join(REPORT, 'history');
const historyTo = path.join(RESULTS, 'history');
fs.rmSync(historyTo, { recursive: true, force: true });
if (fs.existsSync(historyFrom)) {
  fs.cpSync(historyFrom, historyTo, { recursive: true });
  console.log(`Đã chép lịch sử ${historyFrom} → ${historyTo}`);
} else {
  console.log(`Chưa có ${historyFrom}: báo cáo này không có Trend của các lần trước`);
}

fs.writeFileSync(
  path.join(RESULTS, 'executor.json'),
  JSON.stringify(executorInfo(opts.title), null, 2)
);

markFlaky();

/**
 * Test có nhiều lần chạy (retry) cùng `historyId`: lần cuối `passed` mà có lần trước đỏ → `flaky: true`.
 * Kết quả của nhiều lần `pnpm test*` gộp lại (`E2E_KEEP_RESULTS=1`) cũng tính như retry: đỏ ở lần này, xanh ở
 * lần sau thì là chập chờn.
 */
function markFlaky() {
  /** @type {Map<string, { file: string, data: any }[]>} */
  const byHistory = new Map();
  for (const name of fs.readdirSync(RESULTS)) {
    if (!name.endsWith('-result.json')) continue;
    const file = path.join(RESULTS, name);
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!data.historyId) continue;
    if (!byHistory.has(data.historyId)) byHistory.set(data.historyId, []);
    byHistory.get(data.historyId)?.push({ file, data });
  }
  let count = 0;
  for (const runs of byHistory.values()) {
    if (runs.length < 2) continue;
    runs.sort((a, b) => (a.data.start ?? 0) - (b.data.start ?? 0));
    const last = runs[runs.length - 1];
    const failedBefore = runs
      .slice(0, -1)
      .some((r) => r.data.status === 'failed' || r.data.status === 'broken');
    if (last.data.status === 'passed' && failedBefore) {
      last.data.statusDetails = { ...last.data.statusDetails, flaky: true };
      fs.writeFileSync(last.file, JSON.stringify(last.data));
      count++;
    }
  }
  if (count > 0) console.log(`Đánh dấu ${count} test chập chờn (đỏ rồi xanh khi retry)`);
}

/** Chạy allure CLI, trả mã thoát. @param {string[]} args @returns {Promise<number>} */
function runAllure(args) {
  return new Promise((resolve) => {
    allure(args).on('exit', (code) => resolve(code ?? 1));
  });
}

let code = await runAllure(['generate', RESULTS, '--clean', '-o', REPORT]);
if (code === 0 && opts['single-file']) {
  code = await runAllure(['generate', '--single-file', RESULTS, '--clean', '-o', SINGLE]);
}
process.exit(code);
