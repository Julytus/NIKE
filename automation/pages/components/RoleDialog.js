/** Hộp thoại "Create Role" / "Edit Role". */
export class RoleDialog {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.root = page.getByRole('dialog', { name: /^(Create|Edit) Role$/ });
    this.nameInput = this.root.getByLabel('Role name', { exact: true });
    this.createButton = this.root.getByRole('button', { name: 'Create', exact: true });
    this.updateButton = this.root.getByRole('button', { name: 'Update', exact: true });
    this.cancelButton = this.root.getByRole('button', { name: 'Cancel', exact: true });
  }

  /** Tiêu đề hộp thoại. */
  title() {
    return this.root.getByRole('heading');
  }

  /** Dòng báo lỗi dưới ô tên. @param {string} message */
  error(message) {
    return this.root.getByText(message, { exact: true });
  }

  /** Điền tên và bấm "Create". @param {string} name */
  async create(name) {
    await this.nameInput.fill(name);
    await this.createButton.click();
  }

  /** Thay tên và bấm "Update". @param {string} name */
  async update(name) {
    await this.nameInput.fill(name);
    await this.updateButton.click();
  }
}
