/** API tài khoản khách hàng: đăng ký, kiểm tra email, thông tin của tôi. */
export class AccountApi {
  /** @param {import('./ApiClient.js').ApiClient} client */
  constructor(client) {
    this.client = client;
  }

  /**
   * Gửi nguyên body (dùng được cho cả dữ liệu sai).
   * @param {{ name?: string, email?: string, plainPassword?: string }} body
   */
  register(body) {
    return this.client.post('/account/register', body);
  }

  /**
   * Kiểm tra email đã có tài khoản chưa (công khai — plan dang-nhap-nike §5.1). Gửi nguyên body.
   * @param {unknown} body
   */
  checkEmail(body) {
    return this.client.post('/account/public/check-email', body);
  }

  me() {
    return this.client.get('/account/me');
  }
}
