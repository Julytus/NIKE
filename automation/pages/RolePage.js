import { BasePage } from './BasePage.js';
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog.js';
import { RoleDialog } from './components/RoleDialog.js';

/** Trang quản trị Chức vụ `/admin/chuc-vu`. */
export class RolePage extends BasePage {
  path = '/admin/chuc-vu';

  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Chức vụ', exact: true });
    this.filterToggle = page.getByRole('button', { name: 'Bộ lọc', exact: true });
    this.searchInput = page.getByPlaceholder('Tìm theo tên chức vụ...');
    // Màn hẹp chỉ còn biểu tượng "+" (chữ "Thêm chức vụ" ẩn dưới lg) nên dự phòng bằng icon.
    this.addButton = page
      .getByRole('button', { name: 'Thêm chức vụ', exact: true })
      .or(page.locator('button:has(svg.lucide-plus)'))
      .first();
    this.dataRows = page.locator('tbody tr');
    this.dialog = new RoleDialog(page);
    this.deleteDialog = new DeleteConfirmDialog(page);
  }

  /** Mở trang và chờ tiêu đề "Chức vụ". */
  async open() {
    await this.goto();
    await this.heading.waitFor();
  }

  /** Lọc bảng theo tên (ô tìm có độ trễ 400 ms). @param {string} keyword */
  async search(keyword) {
    if (!(await this.searchInput.isVisible())) await this.filterToggle.click();
    await this.searchInput.fill(keyword);
  }

  /** Bấm "Thêm chức vụ", trả về hộp thoại. */
  async openCreate() {
    await this.addButton.click();
    return this.dialog;
  }

  /** Dòng của chức vụ có tên đúng `name`. @param {string} name */
  row(name) {
    return this.dataRows.filter({ has: this.page.getByText(name, { exact: true }) });
  }

  /** Mở menu thao tác (⋮) của dòng `name`. @param {string} name */
  async openRowActions(name) {
    await this.page.getByRole('button', { name: `Thao tác ${name}`, exact: true }).click();
  }

  /** "Chỉnh sửa" dòng `name`, trả về hộp thoại. @param {string} name */
  async edit(name) {
    await this.openRowActions(name);
    await this.page.getByRole('menuitem', { name: 'Chỉnh sửa', exact: true }).click();
    return this.dialog;
  }

  /** "Xóa" dòng `name`, trả về hộp thoại xác nhận. @param {string} name */
  async delete(name) {
    await this.openRowActions(name);
    await this.page.getByRole('menuitem', { name: 'Xóa', exact: true }).click();
    return this.deleteDialog;
  }
}
