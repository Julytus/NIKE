#!/usr/bin/env node
/**
 * Playwright server chạy trong Docker cho test `@visual` (plan kiem-thu-giao-dien §3 L1, §5.1, §5.5).
 * Trình duyệt chạy trong image `mcr.microsoft.com/playwright:v<phiên bản>-noble` (Linux), test runner vẫn chạy
 * trên máy và kết nối qua `E2E_PW_WS`, nên ảnh chụp ở máy Windows và trên CI giống nhau.
 *
 * Dùng:
 *   node scripts/visual-server.mjs [start]   bật container `nike-pw-server` (đã chạy thì thôi)
 *   node scripts/visual-server.mjs stop      tắt container
 *   node scripts/visual-server.mjs status    in trạng thái (chưa chạy → thoát 1)
 *   node scripts/visual-server.mjs test …    start → đặt E2E_PW_WS → run-phases.mjs tests/visual/ …
 * Cổng trên máy: `E2E_PW_PORT` (mặc định 3100).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const CONTAINER = 'nike-pw-server';
const PORT = Number(process.env.E2E_PW_PORT || 3100);
const WS = `ws://127.0.0.1:${PORT}/`;
const READY_TIMEOUT_MS = 120_000;

const MSG = {
  ready: `Playwright server sẵn sàng: ${WS}`,
  running: `Playwright server đang chạy: ${WS}`,
  stopped: 'Playwright server chưa chạy',
  noDocker: 'Không gọi được Docker — bật Docker Desktop rồi chạy lại',
  timeout: `Playwright server không lên sau ${READY_TIMEOUT_MS / 1000}s`,
  portBusy: `Cổng ${PORT} đang bận — đặt E2E_PW_PORT khác`,
};

/** Phiên bản `@playwright/test` đang cài — image và `playwright run-server` phải trùng phiên bản này. */
function playwrightVersion() {
  const pkg = new URL('../node_modules/@playwright/test/package.json', import.meta.url);
  return JSON.parse(fs.readFileSync(pkg, 'utf8')).version;
}

/** Chạy lệnh docker, trả `{ status, stdout }`; không gọi được docker thì `status = null`. */
function docker(args, { inherit = false } = {}) {
  const r = spawnSync('docker', args, {
    encoding: 'utf8',
    stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
  });
  return { status: r.error ? null : r.status, stdout: (r.stdout ?? '').trim() };
}

function requireDocker() {
  if (docker(['info', '--format', '{{.ServerVersion}}']).status !== 0) {
    console.error(MSG.noDocker);
    process.exit(2);
  }
}

function isRunning() {
  const r = docker(['ps', '--filter', `name=^${CONTAINER}$`, '--format', '{{.Names}}']);
  return r.status === 0 && r.stdout.split('\n').includes(CONTAINER);
}

/** Có tiến trình nào đang nhận kết nối ở cổng không (dùng khi container chưa chạy). */
function portInUse() {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port: PORT });
    socket.setTimeout(1000);
    socket.once('connect', () => (socket.destroy(), resolve(true)));
    socket.once('timeout', () => (socket.destroy(), resolve(false)));
    socket.once('error', () => resolve(false));
  });
}

/**
 * Server trả lời HTTP thì coi là sẵn sàng. Không dùng kết nối TCP thuần vì proxy cổng của Docker nhận
 * kết nối ngay cả khi tiến trình trong container chưa nghe.
 */
function httpAlive() {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port: PORT, path: '/', timeout: 2000 }, (res) => {
      res.resume();
      resolve(true);
    });
    req.once('timeout', () => req.destroy());
    req.once('error', () => resolve(false));
  });
}

async function waitReady() {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await httpAlive()) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

/** Bật server; trả mã thoát (0 = sẵn sàng). */
async function start() {
  requireDocker();
  if (isRunning()) {
    if (!(await waitReady())) return failTimeout();
    console.log(MSG.running);
    return 0;
  }
  if (await portInUse()) {
    console.error(MSG.portBusy);
    return 2;
  }
  const version = playwrightVersion();
  const image = `mcr.microsoft.com/playwright:v${version}-noble`;
  console.log(`Bật ${CONTAINER} (${image}) ở cổng ${PORT}…`);
  const run = docker(
    [
      'run',
      '-d',
      '--rm',
      '--name',
      CONTAINER,
      '--init',
      '--ipc=host',
      '-p',
      `127.0.0.1:${PORT}:3000`,
      image,
      '/bin/sh',
      '-c',
      `npx -y playwright@${version} run-server --port 3000 --host 0.0.0.0`,
    ],
    { inherit: true }
  );
  if (run.status === null) {
    console.error(MSG.noDocker);
    return 2;
  }
  if (run.status !== 0) return run.status;
  if (!(await waitReady())) return failTimeout();
  console.log(MSG.ready);
  return 0;
}

function failTimeout() {
  console.error(MSG.timeout);
  docker(['logs', '--tail', '40', CONTAINER], { inherit: true });
  return 1;
}

function stop() {
  requireDocker();
  if (!isRunning()) {
    console.log(MSG.stopped);
    return 0;
  }
  return docker(['stop', CONTAINER], { inherit: true }).status ?? 2;
}

function status() {
  requireDocker();
  if (isRunning()) {
    console.log(MSG.running);
    return 0;
  }
  console.log(MSG.stopped);
  return 1;
}

/** `test …`: bật server rồi chạy `tests/visual/` (mọi test có @visual) ở hai project; `-g` của người dùng lọc tiếp. */
async function test(extra) {
  const code = await start();
  if (code !== 0) return code;
  const runPhases = fileURLToPath(new URL('./run-phases.mjs', import.meta.url));
  const r = spawnSync(
    process.execPath,
    [runPhases, 'tests/visual/', '--project=chromium', '--project=mobile-chrome', ...extra],
    { stdio: 'inherit', env: { ...process.env, E2E_PW_WS: WS } }
  );
  return r.status ?? 1;
}

const [cmd = 'start', ...rest] = process.argv.slice(2);
const commands = {
  start: () => start(),
  stop: () => stop(),
  status: () => status(),
  test: () => test(rest),
};
if (!(cmd in commands)) {
  console.error(`Lệnh không hợp lệ "${cmd}" — dùng start | stop | status | test`);
  process.exit(2);
}
process.exit(await commands[/** @type {keyof typeof commands} */ (cmd)]());
