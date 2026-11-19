/**
 * API hỗ trợ kiểm thử (chỉ có ở profile `local` / `test`, chỉ role operator):
 * `GET /test-support/summary` đếm dữ liệu mẫu, `POST /test-support/reset` nạp lại từ `products.json`,
 * `POST /test-support/stock` đặt tồn kho một size (plan dat-hang §5.4).
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

  /**
   * Đặt tồn kho của một size. `stock === undefined` → bỏ khoá `stock` khỏi body.
   * @param {number} sizeId
   * @param {number} [stock]
   */
  setStock(sizeId, stock) {
    return this.client.post(
      '/test-support/stock',
      stock === undefined ? { id: sizeId } : { id: sizeId, stock }
    );
  }

  /**
   * Đặt tồn kho và khẳng định thành công (chuẩn bị dữ liệu test).
   * @param {number} sizeId
   * @param {number} stock
   */
  async setStockOk(sizeId, stock) {
    return this.client.expectOk(await this.setStock(sizeId, stock));
  }
}
