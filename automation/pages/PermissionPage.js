import { BasePage } from './BasePage.js';

/** Trang quản trị Phân quyền `/admin/phan-quyen` (ma trận tài nguyên × thao tác theo chức vụ). */
export class PermissionPage extends BasePage {
  path = '/admin/phan-quyen';

  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Phân quyền', exact: true });
    this.matrix = page.getByRole('table');
  }

  /** Mở ma trận của chức vụ `roleId`. @param {number} roleId */
  async openForRole(roleId) {
    await this.goto(`${this.path}?roleId=${roleId}`);
  }

  /** Hàng tài nguyên theo tên hiển thị, vd "Quản lý chức vụ". @param {string} name */
  resourceRow(name) {
    return this.matrix.getByRole('row').filter({ hasText: name });
  }
}
