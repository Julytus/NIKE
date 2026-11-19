import { API_URL } from '../utils/env.js';

/**
 * API đơn hàng của khách đã đăng nhập (plan dat-hang §5): `POST /shop-order/create` (đặt COD),
 * `GET /shop-order/get?code=` (chỉ chủ đơn). Trả response thô để test tự kiểm status.
 */
export class OrderApi {
  /** @param {import('./ApiClient.js').ApiClient} client */
  constructor(client) {
    this.client = client;
  }

  /**
   * Gửi nguyên `body` dạng JSON (kể cả mảng / chuỗi sai để kiểm validate §5.3).
   * `body === undefined` → không gửi body (vẫn có `Content-Type: application/json`).
   * @param {unknown} [body]
   */
  create(body) {
    return this.client.request.post(`${API_URL}/shop-order/create`, {
      headers: { ...this.client.headers(), 'Content-Type': 'application/json' },
      data: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  /** Gọi sai method (TC-11). */
  createWithGet() {
    return this.client.get('/shop-order/create');
  }

  /**
   * `code === undefined` → không gửi tham số `code`.
   * @param {string} [code]
   */
  get(code) {
    return this.client.get('/shop-order/get', code === undefined ? undefined : { code });
  }
}
