/** Hộp thoại đăng ký tài khoản khách của cửa hàng. */
export class ShopRegisterDialog {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.root = page
      .getByRole('dialog')
      .filter({ has: page.getByLabel('Họ tên', { exact: true }) });
    this.nameInput = this.root.getByLabel('Họ tên', { exact: true });
    this.emailInput = this.root.getByLabel('Email', { exact: true });
    this.passwordInput = this.root.getByLabel('Mật khẩu', { exact: true });
    this.termsCheckbox = this.root.getByRole('checkbox', { name: /^Tôi đồng ý với/ });
    this.submitButton = this.root.getByRole('button', { name: 'Tạo tài khoản', exact: true });
  }

  /** @param {{ name: string, email: string, password: string }} data */
  async register({ name, email, password }) {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.termsCheckbox.check();
    await this.submitButton.click();
  }
}
