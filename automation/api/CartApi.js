import { API_URL } from '../utils/env.js';

/**
 * API công khai của giỏ hàng (plan gio-hang §5): `POST /cart/public/check` tính lại giỏ localStorage
 * theo giá / tồn kho mới nhất. Không cần token. Trả response thô để test tự kiểm status.
 */
export class CartApi {
  /** @param {import('./ApiClient.js').ApiClient} client */
  constructor(client) {
    this.client = client;
  }

  /**
   * Gửi nguyên `body` dạng JSON (kể cả object / chuỗi sai để kiểm validate §5.2).
   * `body === undefined` → không gửi body (vẫn có `Content-Type: application/json`).
   * @param {unknown} [body]
   */
  check(body) {
    return this.client.request.post(`${API_URL}/cart/public/check`, {
      headers: { ...this.client.headers(), 'Content-Type': 'application/json' },
      data: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  /** Gọi sai method (TC-07). */
  checkWithGet() {
    return this.client.get('/cart/public/check');
  }
}
