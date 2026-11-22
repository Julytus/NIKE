// @ts-check
import 'dotenv/config';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { defineConfig, devices } from '@playwright/test';

import { BASE_URL } from './utils/env.js';
import { environmentInfo, frontendMode, runInfo } from './utils/report-env.js';

const isCI = !!process.env.CI;
const slowMo = Number(process.env.E2E_SLOWMO ?? 0);
// Local: mọi trình duyệt cùng lấy module từ một tiến trình Vite dev; mặc định (nửa số nhân, 8 trên máy 16 nhân)
// làm `goto` của Firefox / WebKit có lúc > 30 giây (plan kiem-thu-hoi-quy §12) → 4. CI (4 vCPU) → 2.
// Đổi bằng E2E_WORKERS ở cả hai nơi (plan ci-bao-cao §5.2).
const workers = Number(process.env.E2E_WORKERS ?? (isCI ? 2 : 4));
// Tên file blob, để các shard của CI không trùng tên khi gộp (`pnpm report:all`).
const reportTag = process.env.E2E_REPORT_TAG || 'local';

// Chỉ chạy project `api` (vd `pnpm test:api`) thì không cần bật frontend.
const onlyApi =
  process.argv.some((a) => a === '--project=api' || a === 'api') &&
  !process.argv.some((a) => /--project=(chromium|firefox|webkit|mobile-chrome|setup)/.test(a));

// Pha `@stock` (plan dat-hang §7.1 bước 1): test làm đổi tồn kho (tạo đơn, setStock) chạy ở lần
// `playwright test` thứ hai với `E2E_STOCK=1`, sau một lần reset riêng, để không làm sai các spec cũ
// đang so tồn kho chính xác với products.json. `scripts/run-phases.mjs` chạy lần lượt hai pha.
const stockPhase = process.env.E2E_STOCK === '1';
const STOCK_TAG = /@stock/;
const phaseFilter = stockPhase ? { grep: STOCK_TAG } : { grepInvert: STOCK_TAG };
const phaseName = stockPhase ? 'stock' : 'main';

// Frontend Playwright tự bật: Vite dev (mặc định, máy local) hoặc bản build `vite preview` (CI, cần `pnpm build` trước).
const frontendCommand =
  frontendMode === 'preview'
    ? 'pnpm --dir ../frontend preview --strictPort'
    : 'pnpm --dir ../frontend dev';

// Link `tms` của Allure trỏ về plan của lát (nhãn gắn ở auto fixture `allureLabels`).
const { repoUrl } = runInfo();

const uiProject = {
  dependencies: ['setup'],
  testIgnore: /tests[\\/]api[\\/]/,
  ...phaseFilter,
};
// Visual + a11y chỉ chạy ở `chromium` và `mobile-chrome` (plan kiem-thu-giao-dien §11 câu 4).
const noVisualProject = { ...uiProject, testIgnore: /tests[\\/](api|visual|a11y)[\\/]/ };

export default defineConfig({
  testDir: './tests',
  outputDir: stockPhase ? './test-results-stock' : './test-results',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers,
  timeout: 30_000,
  // Vite dev biên dịch module ở lần tải đầu: Firefox / WebKit chạy song song có thể mất > 7 giây
  expect: {
    timeout: 10_000,
    // plan kiem-thu-giao-dien §5.2: ảnh luôn do Chromium Linux trong Docker vẽ (Playwright server).
    // TC-17 đo 3 lần × 2 project: lệch 0 pixel → không cho lệch pixel nào (thay cho tỉ lệ 0,2 % dự kiến,
    // vì 0,2 % bỏ lọt thay đổi nhỏ như giá dời 6px trên mobile — plan §12).
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      threshold: 0.2,
      maxDiffPixels: 0,
      stylePath: fileURLToPath(new URL('./tests/visual/screenshot.css', import.meta.url)),
    },
  },
  // Một bộ ảnh chuẩn (không có `{platform}`): `tests/visual/__screenshots__/<project>/<tên>.png`.
  snapshotPathTemplate: '{testDir}/{testFileDir}/__screenshots__/{projectName}/{arg}{ext}',
  // CI không tự ghi ảnh chuẩn: trang mới chưa có ảnh là đỏ hẳn (E5).
  updateSnapshots: isCI ? 'none' : 'missing',
  globalSetup: './global-setup.js',
  reporter: [
    ...(isCI ? [['dot'], ['github']] : [['list']]),
    [
      'html',
      { outputFolder: stockPhase ? 'playwright-report-stock' : 'playwright-report', open: 'never' },
    ],
    // Mỗi pha một thư mục (reporter blob xoá outputDir ở đầu lần chạy); `pnpm report:all` gộp lại.
    ['blob', { outputDir: `blob-report/${phaseName}`, fileName: `${phaseName}-${reportTag}.zip` }],
    [
      'allure-playwright',
      {
        resultsDir: 'allure-results',
        detail: true,
        suiteTitle: true,
        environmentInfo: environmentInfo({ workers }),
        categories: JSON.parse(
          fs.readFileSync(new URL('./allure/categories.json', import.meta.url), 'utf8')
        ),
        links: {
          tms: {
            urlTemplate: `${repoUrl}/blob/main/plan/%s.md`,
            nameTemplate: 'plan/%s.md',
          },
        },
      },
    ],
  ],
  use: {
    baseURL: BASE_URL,
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Xem luồng bằng mắt: E2E_SLOWMO=400 pnpm exec playwright test <spec> --headed --workers=1
    launchOptions: { slowMo },
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.js/, use: { ...devices['Desktop Chrome'] } },
    { name: 'api', testMatch: /tests[\\/]api[\\/].*\.spec\.js/, ...phaseFilter },
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, ...uiProject },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, ...noVisualProject },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, ...noVisualProject },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] }, ...uiProject },
  ],
  webServer:
    onlyApi || process.env.E2E_SKIP_WEBSERVER
      ? undefined
      : {
          command: frontendCommand,
          url: BASE_URL,
          reuseExistingServer: !isCI,
          timeout: 120_000,
          stdout: 'ignore',
        },
});
