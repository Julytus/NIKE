/**
 * API hỗ trợ kiểm thử (chỉ có ở profile `local` / `test`, chỉ role operator):
 * `GET /test-support/summary` đếm dữ liệu mẫu, `POST /test-support/reset` nạp lại từ `products.json`.
 */
export class TestSupportApi {
  /** @param {import('./ApiClient.js').ApiClient} client */
  constructor(client) {
    this.client = client;
  }

  summary() {
    return this.client.get('/test-support/summary');
  }

  reset() {
    return this.client.post('/test-support/reset');
  }
}
