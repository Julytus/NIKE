/**
 * Thẻ sản phẩm (`ProductCard`, testid `product-card`; thẻ gợi ý tìm kiếm `search-suggestion` cùng quy tắc):
 * cả thẻ là link `/t/<slug>`. Phần tử con có testid `product-name`, `product-subtitle`, `product-badge`,
 * `product-price`; giá gốc khi giảm nằm trong `<s>` (plan giao-dien-nike §6.6). Dùng lại ở lát 1.4.
 */
export class ProductCard {
  /** @param {import('@playwright/test').Locator} root */
  constructor(root) {
    this.root = root;
    this.name = root.getByTestId('product-name');
    this.subtitle = root.getByTestId('product-subtitle');
    this.badge = root.getByTestId('product-badge');
    this.price = root.getByTestId('product-price');
    this.originalPrice = root.locator('s');
    this.image = root.getByRole('img');
  }

  href() {
    return this.root.getAttribute('href');
  }
}
