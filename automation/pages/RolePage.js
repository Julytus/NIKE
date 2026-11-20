import { BasePage } from './BasePage.js';
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog.js';
import { RoleDialog } from './components/RoleDialog.js';

/** Trang quản trị Chức vụ `/admin/roles`. */
export class RolePage extends BasePage {
  path = '/admin/roles';

  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Roles', exact: true });
    this.filterToggle = page.getByRole('button', { name: 'Filters', exact: true });
    this.searchInput = page.getByPlaceholder('Search by role name...');
    // Màn hẹp chỉ còn biểu tượng "+" (chữ "Add Role" ẩn dưới lg) nên dự phòng bằng icon.
    this.addButton = page
      .getByRole('button', { name: 'Add Role', exact: true })
      .or(page.locator('button:has(svg.lucide-plus)'))
      .first();
    this.dataRows = page.locator('tbody tr');
    this.dialog = new RoleDialog(page);
    this.deleteDialog = new DeleteConfirmDialog(page);
  }

  /** Mở trang và chờ tiêu đề "Roles". */
  async open() {
    await this.goto();
    await this.heading.waitFor();
  }

  /** Lọc bảng theo tên (ô tìm có độ trễ 400 ms). @param {string} keyword */
  async search(keyword) {
    if (!(await this.searchInput.isVisible())) await this.filterToggle.click();
    // Ô lọc debounce 400 ms rồi bảng tải lại: thao tác trên dòng trước lúc đó có thể mất (menu ⋮ mở trên bảng
    // cũ, plan kiem-thu-hoi-quy §12) → chờ response `role/list` đúng từ khoá
    const loaded = this.page.waitForResponse((res) => {
      const url = new URL(res.url());
      return (
        url.pathname.endsWith('/role/list') && url.searchParams.get('keyword') === keyword.trim()
      );
    });
    await this.searchInput.fill(keyword);
    await loaded;
  }

  /** Bấm "Add Role", trả về hộp thoại. */
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
    await this.page.getByRole('button', { name: `Actions ${name}`, exact: true }).click();
  }

  /** "Edit" dòng `name`, trả về hộp thoại. @param {string} name */
  async edit(name) {
    await this.openRowActions(name);
    await this.page.getByRole('menuitem', { name: 'Edit', exact: true }).click();
    return this.dialog;
  }

  /** "Delete" dòng `name`, trả về hộp thoại xác nhận. @param {string} name */
  async delete(name) {
    await this.openRowActions(name);
    await this.page.getByRole('menuitem', { name: 'Delete', exact: true }).click();
    return this.deleteDialog;
  }
}
