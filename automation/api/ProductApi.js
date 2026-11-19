/**
 * API công khai của cửa hàng giày (không cần token): danh mục, "Mới về", gợi ý tìm kiếm,
 * danh sách có lọc + số đếm theo bộ lọc, chi tiết + "You Might Also Like". Trả response thô để test
 * tự kiểm status (plan giao-dien-nike §5, danh-sach-giay §5, chi-tiet-giay §5).
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

  /**
   * Danh sách giày có lọc / sắp xếp / phân trang (plan danh-sach-giay §5.1). Gửi nguyên object tham số.
   * @param {Record<string, string | number>} [params]
   */
  list(params) {
    return this.client.get('/product/public/list', params);
  }

  /**
   * Số sản phẩm theo từng lựa chọn lọc (plan danh-sach-giay §5.2).
   * @param {Record<string, string | number>} [params]
   */
  facets(params) {
    return this.client.get('/product/public/facets', params);
  }

  /**
   * Chi tiết sản phẩm theo slug, kèm 5 ảnh + lưới size có tồn kho (plan chi-tiet-giay §5.1).
   * @param {string} [slug] bỏ trống thì không gửi tham số `slug`
   */
  get(slug) {
    return this.client.get('/product/public/get', slug === undefined ? undefined : { slug });
  }

  /**
   * "You Might Also Like": tối đa 8 thẻ, cùng danh mục trước (plan chi-tiet-giay §5.2).
   * @param {string} [slug] bỏ trống thì không gửi tham số `slug`
   */
  related(slug) {
    return this.client.get('/product/public/related', slug === undefined ? undefined : { slug });
  }
}
