/** Menu trượt trên điện thoại (dialog "Menu") — plan giao-dien-nike §6.3. */
export class MobileMenu {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.root = page.getByRole('dialog', { name: 'Menu' });
    this.closeButton = this.root.getByRole('button', { name: 'Đóng menu', exact: true });
    this.backButton = this.root.getByRole('button', { name: 'Quay lại', exact: true });
    this.jordanLink = this.root.getByRole('link', { name: 'Jordan', exact: true });
    this.joinButton = this.root.getByRole('button', { name: 'Tham gia', exact: true });
    this.loginButton = this.root.getByRole('button', { name: 'Đăng nhập', exact: true });
  }

  /** Nút mục chính ("Nam", "Nữ"…) ở danh sách chính. @param {string} name */
  item(name) {
    return this.root.getByRole('button', { name, exact: true });
  }

  /** Tiêu đề h2 của panel con. @param {string} name */
  panelHeading(name) {
    return this.root.getByRole('heading', { level: 2, name, exact: true });
  }

  /** @param {string} name */
  link(name) {
    return this.root.getByRole('link', { name, exact: true });
  }
}
