/**
 * Thông tin về lần chạy, dùng chung cho Allure (`environmentInfo`, `executor.json`) và bảng số liệu
 * `scripts/summarize.mjs` (plan ci-bao-cao §6.3). Trên GitHub Actions lấy từ biến `GITHUB_*`, ở máy thì hỏi git.
 */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import os from 'node:os';

import { API_URL, BASE_URL } from './env.js';

const require = createRequire(import.meta.url);
const env = process.env;

/** Chạy git, lỗi (không có git / không phải repo) thì trả chuỗi rỗng. @param {string[]} args */
function git(args) {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

/** Đang chạy trên GitHub Actions? */
export const onGitHubActions = env.GITHUB_ACTIONS === 'true';

/** @typedef {{ runner: string, branch: string, commit: string, repoUrl: string, buildUrl: string | undefined }} RunInfo */
/** @type {RunInfo | undefined} */
let cachedRun;

/**
 * "Chạy ở", nhánh, commit (7 ký tự) và địa chỉ repo của lần chạy hiện tại (tính một lần mỗi tiến trình).
 * @returns {RunInfo}
 */
export function runInfo() {
  if (cachedRun) return cachedRun;
  const runner = onGitHubActions
    ? `GitHub Actions · ${env.GITHUB_WORKFLOW} #${env.GITHUB_RUN_NUMBER}`
    : 'Máy local';
  const branch = env.GITHUB_REF_NAME || git(['rev-parse', '--abbrev-ref', 'HEAD']);
  const commit = (env.GITHUB_SHA || git(['rev-parse', 'HEAD'])).slice(0, 7);
  const repoUrl =
    env.GITHUB_SERVER_URL && env.GITHUB_REPOSITORY
      ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}`
      : git(['remote', 'get-url', 'origin'])
          .replace(/^git@([^:]+):/, 'https://$1/')
          .replace(/\.git$/, '');
  const buildUrl = onGitHubActions
    ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`
    : undefined;
  cachedRun = { runner, branch, commit, repoUrl, buildUrl };
  return cachedRun;
}

/** Chế độ frontend Playwright tự bật: `dev` (Vite dev) hoặc `preview` (bản build). */
export const frontendMode = env.E2E_FRONTEND === 'preview' ? 'preview' : 'dev';

/**
 * Khoá theo đúng thứ tự §6.3, ghi vào `environment.properties` của Allure.
 * @param {{ workers: number | string }} opts
 * @returns {Record<string, string>}
 */
export function environmentInfo({ workers }) {
  const run = runInfo();
  return {
    'Chạy ở': run.runner,
    Nhánh: run.branch,
    Commit: run.commit,
    'Hệ điều hành': `${os.type()} ${os.release()}`,
    Node: process.version,
    Playwright: require('@playwright/test/package.json').version,
    Frontend: `${BASE_URL} (${frontendMode})`,
    Backend: API_URL,
    Worker: String(workers),
  };
}

/** Hai chữ số. @param {number} n */
const pad = (n) => String(n).padStart(2, '0');

/**
 * Nội dung `allure-results/executor.json` (§6.3).
 * @param {string} title tên báo cáo, vd "Smoke", "Regression đêm", "Toàn bộ"
 */
export function executorInfo(title) {
  if (onGitHubActions) {
    return {
      name: 'GitHub Actions',
      type: 'github',
      buildName: `${env.GITHUB_WORKFLOW} #${env.GITHUB_RUN_NUMBER}`,
      buildOrder: Number(env.GITHUB_RUN_NUMBER),
      buildUrl: runInfo().buildUrl,
      reportName: `Nike Shoes — ${title}`,
    };
  }
  const now = new Date();
  return {
    name: 'Máy local',
    type: 'local',
    buildName: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`,
    buildOrder: Math.floor(now.getTime() / 1000),
    reportName: `Nike Shoes — ${title}`,
  };
}
