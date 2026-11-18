/**
 * API công khai của cửa hàng giày (không cần token): danh mục, "Mới về", gợi ý tìm kiếm.
 * Trả response thô để test tự kiểm status (plan giao-dien-nike §5).
 */
export class ProductApi {
  /** @param {import('./ApiClient.js').ApiClient} client */
  constructor(client) {
    this.client = client;
  }

  categories() {
    return this.client.get('/product-category/public/list');
  }

  newArrivals() {
    return this.client.get('/product/public/new-arrivals');
  }

  /** @param {string} [q] bỏ trống thì không gửi tham số `q` */
  suggest(q) {
    return this.client.get('/product/public/suggest', q === undefined ? undefined : { q });
  }
}
