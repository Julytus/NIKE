import { accounts } from './data/accounts.js';
import { API_URL } from './utils/env.js';

/**
 * Chạy một lần trước mọi test:
 * 1. Backend chưa chạy thì dừng ngay với hướng dẫn rõ ràng, thay vì để hàng loạt test đỏ khó hiểu
 *    (plan khung-automation, ngoại lệ E1).
 * 2. Đăng nhập admin, gọi `POST /test-support/reset` để dữ liệu cửa hàng về đúng `products.json`
 *    (plan du-lieu-giay §3). Bỏ qua khi đặt `E2E_SKIP_RESET=1`.
 */
export default async function globalSetup() {
  const url = `${API_URL}/v3/api-docs`;
  let status = 0;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    status = res.status;
  } catch {
    status = 0;
  }
  if (status !== 200) {
    const origin = new URL(API_URL).origin;
    throw new Error(`Backend chưa chạy ở ${origin} — chạy: sh scripts/ai/backend-restart.sh`);
  }

  if (process.env.E2E_SKIP_RESET === '1') return;
  try {
    await resetSeedData();
  } catch (e) {
    throw new Error(`Không reset được dữ liệu test: ${e instanceof Error ? e.message : e}`);
  }
}

/** Đăng nhập admin rồi gọi reset; lỗi thì ném message của backend. */
async function resetSeedData() {
  const login = await postJson('/user/authenticate', {
    email: accounts.admin.email,
    plainPassword: accounts.admin.password,
  });
  await postJson('/test-support/reset', undefined, login.token);
}

/**
 * @param {string} path
 * @param {unknown} body
 * @param {string} [token]
 */
async function postJson(path, body, token) {
  /** @type {Record<string, string>} */
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.code !== 200) {
    throw new Error(json?.message ?? `HTTP ${res.status} ${path}`);
  }
  return json.result;
}
