/** API tài khoản khách hàng: đăng ký, thông tin của tôi. */
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

  me() {
    return this.client.get('/account/me');
  }
}
