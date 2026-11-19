import { BasePage } from './BasePage.js';

/** Trang đăng nhập quản trị `/login`. */
export class AdminLoginPage extends BasePage {
  path = '/login';

  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);
    this.identifierInput = page.getByLabel('Email or phone number*', { exact: true });
    this.passwordInput = page.getByLabel('Password*', { exact: true });
    this.rememberMe = page.getByLabel('Remember me', { exact: true });
    this.submitButton = page.getByRole('button', { name: 'Sign In', exact: true });
  }

  /**
   * Điền form và bấm "Sign In" (không chờ kết quả).
   * @param {{ email: string, password: string }} account
   */
  async login({ email, password }) {
    await this.identifierInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
