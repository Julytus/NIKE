#!/usr/bin/env node
/**
 * Chạy Playwright theo hai pha (plan dat-hang §7.1 bước 1):
 *   1. pha thường  — mọi test trừ `@stock` (so tồn kho chính xác với products.json);
 *   2. pha stock   — chỉ test `@stock` (tạo đơn, đặt tồn kho), chạy với `E2E_STOCK=1`.
 * Mỗi lần `playwright test` chạy global-setup (reset dữ liệu) nên pha stock bắt đầu sạch và lần chạy sau
 * của pha thường cũng sạch. Pha 2 vẫn chạy khi pha 1 đỏ; mã thoát ≠ 0 nếu một pha đỏ.
 *
 * Dùng: node scripts/run-phases.mjs [--phase=main|stock] <tham số playwright test…>
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const cli = require.resolve('@playwright/test/cli');

const PHASES = /** @type {const} */ ({
  main: { label: 'pha thường (không @stock)', env: { E2E_STOCK: '' } },
  stock: { label: 'pha stock (@stock)', env: { E2E_STOCK: '1' } },
});

const args = process.argv.slice(2);
const phaseArg = args.find((a) => a.startsWith('--phase='));
const passThrough = args.filter((a) => a !== phaseArg);
const only = phaseArg?.slice('--phase='.length);
if (only !== undefined && !(only in PHASES)) {
  console.error(`--phase phải là main hoặc stock, nhận "${only}"`);
  process.exit(2);
}

const selected = only ? [only] : Object.keys(PHASES);
let failed = false;
for (const name of selected) {
  const phase = PHASES[/** @type {keyof typeof PHASES} */ (name)];
  console.log(`\n=== Playwright — ${phase.label} ===`);
  const result = spawnSync(
    process.execPath,
    [cli, 'test', '--pass-with-no-tests', ...passThrough],
    { stdio: 'inherit', env: { ...process.env, ...phase.env } }
  );
  if (result.status !== 0) {
    failed = true;
    console.log(`=== ${phase.label}: ĐỎ (mã thoát ${result.status ?? result.signal}) ===`);
  }
}
process.exit(failed ? 1 : 0);
