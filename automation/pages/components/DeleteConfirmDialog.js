/** Hộp thoại xác nhận xoá dùng chung ở trang quản trị ("Xóa <loại>"). */
export class DeleteConfirmDialog {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.root = page.getByRole('alertdialog');
    this.confirmButton = this.root.getByRole('button', { name: 'Xóa', exact: true });
    this.cancelButton = this.root.getByRole('button', { name: 'Hủy', exact: true });
  }

  async confirm() {
    await this.confirmButton.click();
  }

  async cancel() {
    await this.cancelButton.click();
  }
}
