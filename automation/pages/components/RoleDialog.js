/** Hộp thoại "Tạo mới chức vụ" / "Chỉnh sửa chức vụ". */
export class RoleDialog {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.root = page.getByRole('dialog', { name: /^(Tạo mới|Chỉnh sửa) chức vụ$/ });
    this.nameInput = this.root.getByLabel('Tên chức vụ', { exact: true });
    this.createButton = this.root.getByRole('button', { name: 'Tạo mới', exact: true });
    this.updateButton = this.root.getByRole('button', { name: 'Cập nhật', exact: true });
    this.cancelButton = this.root.getByRole('button', { name: 'Hủy', exact: true });
  }

  /** Tiêu đề hộp thoại. */
  title() {
    return this.root.getByRole('heading');
  }

  /** Dòng báo lỗi dưới ô tên. @param {string} message */
  error(message) {
    return this.root.getByText(message, { exact: true });
  }

  /** Điền tên và bấm "Tạo mới". @param {string} name */
  async create(name) {
    await this.nameInput.fill(name);
    await this.createButton.click();
  }

  /** Thay tên và bấm "Cập nhật". @param {string} name */
  async update(name) {
    await this.nameInput.fill(name);
    await this.updateButton.click();
  }
}
