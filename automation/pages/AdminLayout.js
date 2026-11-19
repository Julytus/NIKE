import { BasePage } from './BasePage.js';

/** Khung trang quản trị `/admin/*`: thanh bên (sidebar) và lời chào. */
export class AdminLayout extends BasePage {
  path = '/admin';

  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);
    this.sidebar = page.locator('[data-sidebar="sidebar"]');
    this.sidebarToggle = page.getByRole('button', { name: 'Toggle Sidebar' }).first();
    this.greeting = page.getByRole('heading', { name: /^Hi[, ]/ });
    this.accessDenied = page.getByRole('heading', { name: 'Access Denied' });
  }

  /** Trên điện thoại, mở menu trượt để thấy thanh bên. */
  async openSidebar() {
    if (this.isMobile() && !(await this.sidebar.isVisible())) {
      await this.sidebarToggle.click();
    }
  }

  /** Mục trên thanh bên theo tên hiển thị, vd "Roles". @param {string} name */
  menuItem(name) {
    return this.sidebar.getByRole('link', { name, exact: true });
  }

  /** Mở thanh bên (nếu cần) rồi bấm mục `name`. @param {string} name */
  async navigate(name) {
    await this.openSidebar();
    await this.menuItem(name).click();
  }
}
