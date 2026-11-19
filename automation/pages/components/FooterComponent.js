/** Footer cửa hàng — plan giao-dien-nike §6.5 (desktop 3 cột, mobile accordion). */
export class FooterComponent {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.root = page.getByRole('contentinfo');
    this.country = this.root.getByText('Việt Nam', { exact: true });
    this.copyright = this.root.getByText('© 2026 Nike, Inc. Bảo lưu mọi quyền.', { exact: true });
  }

  /** Tiêu đề nhóm (desktop: h2). @param {string} name */
  groupHeading(name) {
    return this.root.getByRole('heading', { level: 2, name, exact: true });
  }

  /** Nút mở / đóng nhóm (mobile accordion). @param {string} name */
  groupToggle(name) {
    return this.root.getByRole('button', { name, exact: true });
  }

  /** @param {string} name */
  link(name) {
    return this.root.getByRole('link', { name, exact: true });
  }
}
