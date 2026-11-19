import { expect } from '@playwright/test';

import { BasePage } from './BasePage.js';

/** Tiêu đề h1 của 3 bước — plan dang-nhap-nike §6.2 → §6.4. */
export const SIGN_IN_HEADINGS = {
  email: 'Enter your email to join us or sign in.',
  password: "What's your password?",
  join: "Now let's make you a Nike Member.",
};

/**
 * Trang `/signin` kiểu nike.com (plan dang-nhap-nike §6): bước email → mật khẩu (`exists = true`)
 * hoặc tạo tài khoản (`exists = false`), cả ba trên cùng một trang, không có header / footer cửa hàng.
 */
export class SignInPage extends BasePage {
  path = '/signin';

  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);
    this.main = page.getByRole('main');
    this.homeLink = page.getByRole('link', { name: 'Nike Home', exact: true });
    this.heading = page.getByRole('heading', { level: 1 });

    // Bước email
    this.country = this.main.getByText('Vietnam', { exact: true });
    this.emailInput = this.main.getByLabel('Email', { exact: true });
    this.continueButton = this.main.getByRole('button', { name: 'Continue', exact: true });
    this.privacyLink = this.main.getByRole('link', { name: 'Privacy Policy', exact: true });
    this.termsLink = this.main.getByRole('link', { name: 'Terms of Use', exact: true });

    // Bước mật khẩu / tạo tài khoản
    this.editButton = this.main.getByRole('button', { name: 'Edit', exact: true });
    this.passwordInput = this.main.getByLabel('Password', { exact: true });
    this.togglePasswordButton = this.main.getByRole('button', { name: /^(Show|Hide) password$/ });
    this.signInButton = this.main.getByRole('button', { name: 'Sign In', exact: true });
    this.nameInput = this.main.getByLabel('Full name', { exact: true });
    this.termsCheckbox = this.main.getByRole('checkbox', { name: /^I agree to/ });
    this.createAccountButton = this.main.getByRole('button', {
      name: 'Create Account',
      exact: true,
    });
    this.signInWithEmailButton = this.main.getByRole('button', {
      name: 'Sign in with this email',
      exact: true,
    });

    // Lỗi server (khối role="alert" trên nút chính)
    this.alert = this.main.getByRole('alert');
  }

  /**
   * Mở `/signin` (kèm `?redirect=` nếu truyền, giữ nguyên chuỗi — dùng được cho giá trị xấu).
   * @param {{ redirect?: string }} [options]
   */
  async goto({ redirect } = {}) {
    const query = redirect === undefined ? '' : `?redirect=${encodeURIComponent(redirect)}`;
    await super.goto(`${this.path}${query}`);
  }

  /** Dòng email đã chuẩn hoá ở bước mật khẩu / tạo tài khoản. @param {string} email */
  emailLine(email) {
    return this.main.getByText(email, { exact: true });
  }

  /** Lỗi validate dưới ô. @param {string} text */
  fieldError(text) {
    return this.main.getByText(text, { exact: true });
  }

  /** @param {keyof typeof SIGN_IN_HEADINGS} step */
  async expectStep(step) {
    await expect(this.heading).toHaveText(SIGN_IN_HEADINGS[step]);
  }

  /** Nhập email và bấm "Continue". @param {string} email */
  async submitEmail(email) {
    await this.emailInput.fill(email);
    await this.continueButton.click();
  }

  /**
   * Email → bước mật khẩu → "Sign In".
   * @param {{ email: string, password: string }} account
   */
  async signIn({ email, password }) {
    await this.submitEmail(email);
    await this.expectStep('password');
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  /**
   * Email → bước tạo tài khoản → điền form, tick điều khoản, "Create Account".
   * @param {{ name: string, email: string, password: string }} data
   */
  async join({ name, email, password }) {
    await this.submitEmail(email);
    await this.expectStep('join');
    await this.fillJoin({ name, password });
    await this.createAccountButton.click();
  }

  /**
   * Điền form tạo tài khoản (đang ở bước join), không bấm gửi.
   * @param {{ name: string, password: string, terms?: boolean }} data
   */
  async fillJoin({ name, password, terms = true }) {
    await this.nameInput.fill(name);
    await this.passwordInput.fill(password);
    if (terms) await this.termsCheckbox.check();
  }
}
