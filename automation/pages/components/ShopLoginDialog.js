/** Hộp thoại "Đăng nhập" của cửa hàng. */
export class ShopLoginDialog {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.root = page.getByRole('dialog', { name: 'Đăng nhập' });
    this.description = this.root.getByText('Đăng nhập để mua sắm và theo dõi đơn hàng.', {
      exact: true,
    });
    this.emailInput = this.root.getByLabel('Email', { exact: true });
    this.passwordInput = this.root.getByLabel('Mật khẩu', { exact: true });
    this.submitButton = this.root.getByRole('button', { name: 'Đăng nhập', exact: true });
  }

  /** @param {{ email: string, password: string }} account */
  async login({ email, password }) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
