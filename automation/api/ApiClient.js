import { expect } from '@playwright/test';

import { API_URL } from '../utils/env.js';

/**
 * Bọc `APIRequestContext` của Playwright: ghép `API_URL`, tự gắn `Authorization: Bearer <token>`,
 * và hai hàm kiểm tra chung cho định dạng trả về của backend
 * (`{ code, message, result }` khi thành công, `{ code, errorCode, message }` khi lỗi).
 */
export class ApiClient {
  /**
   * @param {import('@playwright/test').APIRequestContext} request
   * @param {{ token?: string | null }} [options]
   */
  constructor(request, { token = null } = {}) {
    this.request = request;
    this.token = token;
  }

  /** @param {string | null} token */
  setToken(token) {
    this.token = token;
    return this;
  }

  headers() {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  /**
   * @param {string} path đường dẫn sau `/api`, vd `/role/list`
   * @param {Record<string, string | number | boolean>} [params]
   */
  get(path, params) {
    return this.request.get(`${API_URL}${path}`, { headers: this.headers(), params });
  }

  /**
   * @param {string} path
   * @param {unknown} [data]
   */
  post(path, data) {
    return this.request.post(`${API_URL}${path}`, { headers: this.headers(), data });
  }

  /**
   * Khẳng định HTTP 200 và `code = 200`, trả về `result`.
   * @param {import('@playwright/test').APIResponse} res
   */
  async expectOk(res) {
    const body = await res.json().catch(() => null);
    expect(res.status(), `HTTP ${res.status()} ${res.url()}: ${JSON.stringify(body)}`).toBe(200);
    expect(body?.code).toBe(200);
    return body.result;
  }

  /**
   * Khẳng định lỗi đúng mã HTTP và (nếu truyền) đúng message nguyên văn. Trả về body lỗi.
   * @param {import('@playwright/test').APIResponse} res
   * @param {number} status
   * @param {string} [message]
   */
  async expectError(res, status, message) {
    const body = await res.json().catch(() => null);
    expect(res.status(), `HTTP ${res.status()} ${res.url()}: ${JSON.stringify(body)}`).toBe(status);
    if (message !== undefined) expect(body?.message).toBe(message);
    return body;
  }
}
