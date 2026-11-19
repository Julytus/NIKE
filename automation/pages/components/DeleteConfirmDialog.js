/** Hộp thoại xác nhận xoá dùng chung ở trang quản trị ("Delete <type>"). */
export class DeleteConfirmDialog {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.root = page.getByRole('alertdialog');
    this.confirmButton = this.root.getByRole('button', { name: 'Delete', exact: true });
    this.cancelButton = this.root.getByRole('button', { name: 'Cancel', exact: true });
  }

  async confirm() {
    await this.confirmButton.click();
  }

  async cancel() {
    await this.cancelButton.click();
  }
}
