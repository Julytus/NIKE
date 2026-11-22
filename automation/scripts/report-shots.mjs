#!/usr/bin/env node
/**
 * Chụp ảnh báo cáo cho quyển — `pnpm report:shots` (plan ci-bao-cao §5.1, §8b bước 9).
 * Mở `allure-report/` và `playwright-report-all/` qua một server tĩnh tạm (127.0.0.1, cổng ngẫu nhiên) rồi chụp:
 *   05-allure-overview.png · 06-allure-behaviors.png · 07-allure-categories.png · 08-allure-test.png ·
 *   09-playwright-report-all.png · 10-playwright-visual-slider.png (TC-15 kiem-thu-giao-dien: so ảnh chế độ "Slider")
 * Có `--run <url>` (trang run công khai trên GitHub Actions, lặp lại được, theo thứ tự) thì chụp thêm:
 *   url thứ 1 (run smoke xanh)      → 01-actions-smoke.png + 02-actions-summary.png (đoạn job summary)
 *   url thứ 2 (run regression)      → 03-actions-regression.png
 *   url thứ 3 (run smoke đỏ, TC-15) → 04-actions-failed.png
 *
 * Dùng: node scripts/report-shots.mjs --out <thư mục> [--run <url>…]
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { chromium } from '@playwright/test';

const { values: opts } = parseArgs({
  options: {
    out: { type: 'string' },
    run: { type: 'string', multiple: true, default: [] },
  },
});
if (!opts.out) {
  console.error('Thiếu --out <thư mục>');
  process.exit(2);
}

const ROOT = process.cwd();
for (const file of ['allure-report/index.html', 'playwright-report-all/index.html']) {
  if (!fs.existsSync(path.join(ROOT, file))) {
    console.error(`Chưa có ${file} — chạy pnpm report:all và pnpm allure:generate trước`);
    process.exit(2);
  }
}
fs.mkdirSync(opts.out, { recursive: true });

const MIME = /** @type {Record<string, string>} */ ({
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webm': 'video/webm',
  '.zip': 'application/zip',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
});

/** Server tĩnh chỉ phục vụ hai thư mục báo cáo. */
const ALLOWED = ['allure-report', 'playwright-report-all'];
const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  const file = path.resolve(ROOT, `.${urlPath}`);
  const inside = ALLOWED.some((d) => file.startsWith(path.join(ROOT, d) + path.sep));
  if (!inside || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(undefined)));
const address = server.address();
const base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;

/** Tổng số bước (đệ quy). @param {any} node @returns {number} */
const countSteps = (node) =>
  (node?.steps ?? []).reduce(
    (/** @type {number} */ n, /** @type {any} */ st) => n + 1 + countSteps(st),
    0
  );

/**
 * Test để chụp màn chi tiết của Allure: ưu tiên test có tệp đính kèm, rồi luồng xuyên suốt `e2e-flows` trên chromium
 * (chia chặng bằng `test.step`), rồi test có nhiều bước nhất.
 * @returns {string | undefined} uid
 */
function pickAllureTest() {
  const dir = path.join(ROOT, 'allure-report/data/test-cases');
  let best;
  let bestScore = -1;
  for (const name of fs.readdirSync(dir)) {
    const tc = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
    const steps = countSteps(tc.testStage);
    if (steps === 0) continue;
    const attachments = JSON.stringify(tc.testStage ?? {}).split('"source"').length - 1;
    const isFlow =
      String(tc.fullName ?? '').includes('e2e-flows') &&
      JSON.stringify(tc.parameters ?? []).includes('chromium');
    const score = (attachments > 0 ? 2_000_000 : 0) + (isFlow ? 1_000_000 : 0) + steps;
    if (score > bestScore) {
      bestScore = score;
      best = tc.uid;
    }
  }
  return best;
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: 'vi-VN',
});
const page = await context.newPage();
/** @param {string} name */
const shot = async (name) => {
  await page.screenshot({ path: path.join(opts.out ?? '.', name) });
  console.log(`  ${name}`);
};
/** @param {string} url */
const open = async (url) => {
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
};

/**
 * Trang test TC-15 của lát kiem-thu-giao-dien (chromium) trong HTML report, khối so ảnh `pdp.png` ở chế độ
 * "Slider" (plan kiem-thu-giao-dien §8b bước 10). Báo cáo không có TC-15 (chưa chạy visual) thì bỏ qua.
 */
const shotVisualSlider = async () => {
  await open(
    `${base}/playwright-report-all/index.html#?q=${encodeURIComponent('TC-15 p:chromium')}`
  );
  const link = page.getByRole('link', { name: /TC-15 .*thay đổi giao diện/ }).first();
  if ((await link.count()) === 0) {
    console.log(
      '  (không thấy TC-15 visual trong báo cáo — chạy pnpm test:visual trước; bỏ qua ảnh 10)'
    );
    return;
  }
  await link.click();
  const slider = page.getByText('Slider', { exact: true }).first();
  const found = await slider
    .waitFor({ timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  if (!found) {
    console.log('  (TC-15 không có khối so ảnh — bỏ qua ảnh 10)');
    return;
  }
  await slider.click();
  await slider.scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(500);
  await shot('10-playwright-visual-slider.png');
};

/** Mở nhóm đầu tiên của cây (Behaviors / Categories); cây trống (vd không có test đỏ) thì bỏ qua. */
const expandFirstNode = async () => {
  const node = page.locator('.node__title').first();
  if ((await node.count()) === 0) return;
  await node.click();
  await page.waitForTimeout(500);
};

try {
  console.log(`Ảnh báo cáo → ${opts.out}`);
  await open(`${base}/allure-report/index.html#`);
  await shot('05-allure-overview.png');
  await open(`${base}/allure-report/index.html#behaviors`);
  // Mở epic đầu tiên để thấy feature / test bên trong
  await expandFirstNode();
  await shot('06-allure-behaviors.png');
  await open(`${base}/allure-report/index.html#categories`);
  await expandFirstNode();
  await shot('07-allure-categories.png');
  const uid = pickAllureTest();
  if (uid) {
    await open(`${base}/allure-report/index.html#testresult/${uid}`);
    // Mở "Test body" rồi bước đầu tiên bên trong để thấy các chặng / thao tác
    const body = page.getByText('Test body', { exact: true });
    if ((await body.count()) > 0) await body.first().click();
    await page.waitForTimeout(300);
    const firstStep = page.locator('.step__title_hasContent:visible').first();
    if ((await firstStep.count()) > 0) await firstStep.click();
    await page.waitForTimeout(300);
    await page.waitForTimeout(500);
    await shot('08-allure-test.png');
  }
  await open(`${base}/playwright-report-all/index.html`);
  await shot('09-playwright-report-all.png');
  await shotVisualSlider();

  const [smokeRun, regressionRun, failedRun] = opts.run ?? [];
  if (smokeRun) {
    await open(smokeRun);
    await shot('01-actions-smoke.png');
    // Job summary được GitHub tải lười khi cuộn tới → cuộn xuống cuối rồi chờ tiêu đề hiện ra.
    const summary = page.getByRole('heading', { name: /Kết quả kiểm thử/ }).first();
    await page.mouse.wheel(0, 5000);
    const found = await summary
      .waitFor({ timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
    if (found) {
      await summary.scrollIntoViewIfNeeded();
      await page.mouse.wheel(0, -120);
      await shot('02-actions-summary.png');
    } else {
      // GitHub chỉ hiện job summary cho người đã đăng nhập; trình duyệt ẩn danh của script không thấy.
      console.log(
        '  (không thấy job summary — GitHub chỉ hiện khi đã đăng nhập; chụp tay 02-actions-summary.png)'
      );
    }
  }
  if (regressionRun) {
    await open(regressionRun);
    await shot('03-actions-regression.png');
  }
  if (failedRun) {
    await open(failedRun);
    await shot('04-actions-failed.png');
  }
} finally {
  await browser.close();
  server.close();
}
