/** API xác thực: đăng nhập, gia hạn phiên, đăng xuất. */
export class AuthApi {
  /** @param {import('./ApiClient.js').ApiClient} client */
  constructor(client) {
    this.client = client;
  }

  /** @param {{ email: string, password: string }} account */
  login({ email, password }) {
    return this.client.post('/user/authenticate', { email, plainPassword: password });
  }

  /**
   * Đăng nhập và trả `{ token, refreshToken, userId }` (khẳng định thành công).
   * @param {{ email: string, password: string }} account
   */
  async loginOk(account) {
    return this.client.expectOk(await this.login(account));
  }

  /** @param {string} refreshToken */
  refresh(refreshToken) {
    return this.client.post('/auth/refresh', { refreshToken });
  }

  /** @param {string} refreshToken */
  logout(refreshToken) {
    return this.client.post('/auth/logout', { refreshToken });
  }
}
