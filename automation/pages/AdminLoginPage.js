import { BasePage } from './BasePage.js';

/** Trang đăng nhập quản trị `/login`. */
export class AdminLoginPage extends BasePage {
  path = '/login';

  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);
    this.identifierInput = page.getByLabel('Email hoặc số điện thoại*', { exact: true });
    this.passwordInput = page.getByLabel('Mật khẩu*', { exact: true });
    this.rememberMe = page.getByLabel('Ghi nhớ đăng nhập', { exact: true });
    this.submitButton = page.getByRole('button', { name: 'Đăng nhập', exact: true });
  }

  /**
   * Điền form và bấm "Đăng nhập" (không chờ kết quả).
   * @param {{ email: string, password: string }} account
   */
  async login({ email, password }) {
    await this.identifierInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
