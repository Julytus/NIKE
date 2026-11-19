/**
 * Popup "Added to Bag" mở sau khi bấm "Add to Bag" ở trang chi tiết (plan gio-hang §6.3):
 * ảnh, tên, phụ đề, "Size EU 42", giá một đôi, nút "View Bag (n)" và "Checkout"; tự đóng sau 5 giây.
 */
export class AddedToBagDialog {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.root = page.getByTestId('added-to-bag');
    this.title = this.root.getByText('Added to Bag', { exact: true });
    this.close = this.root.getByRole('button', { name: 'Close', exact: true });
    this.image = this.root.getByRole('img');
    // testid thêm ở phiên A để so chữ chính xác (§6.3 không cấm; ghi §12)
    this.name = this.root.getByTestId('added-to-bag-name');
    this.subtitle = this.root.getByTestId('added-to-bag-subtitle');
    this.size = this.root.getByTestId('added-to-bag-size');
    this.price = this.root.getByTestId('added-to-bag-price');
    this.viewBag = this.root
      .getByRole('button', { name: /^View Bag \(\d+\)$/ })
      .or(this.root.getByRole('link', { name: /^View Bag \(\d+\)$/ }));
    this.checkout = this.root
      .getByRole('button', { name: 'Checkout', exact: true })
      .or(this.root.getByRole('link', { name: 'Checkout', exact: true }));
  }

  /** Dòng chữ trong popup (tên, phụ đề, "Size EU 42", giá). @param {string} text */
  text(text) {
    return this.root.getByText(text, { exact: true });
  }

  /** Nút "View Bag (n)" đúng số. @param {number} n */
  viewBagWith(n) {
    const name = `View Bag (${n})`;
    return this.root
      .getByRole('button', { name, exact: true })
      .or(this.root.getByRole('link', { name, exact: true }));
  }
}
