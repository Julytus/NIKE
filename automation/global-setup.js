import { API_URL } from './utils/env.js';

/**
 * Chạy một lần trước mọi test: backend chưa chạy thì dừng ngay với hướng dẫn rõ ràng,
 * thay vì để hàng loạt test đỏ khó hiểu (plan khung-automation, ngoại lệ E1).
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
}
