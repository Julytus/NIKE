import { expect } from '@playwright/test';

import { BasePage } from './BasePage.js';
import { HeaderComponent } from './components/HeaderComponent.js';

/**
 * Một dòng của giỏ (`<li data-testid="cart-item" data-size-id>`) — plan gio-hang §6.5.
 */
export class CartItem {
  /** @param {import('@playwright/test').Locator} root */
  constructor(root) {
    this.root = root;
    this.name = root.getByTestId('cart-item-name');
    this.subtitle = root.getByTestId('cart-item-subtitle');
    this.size = root.getByTestId('cart-item-size');
    this.price = root.getByTestId('cart-item-price');
    this.originalPrice = root.getByTestId('cart-item-original-price');
    this.quantity = root.getByTestId('cart-item-quantity');
    this.qty = root.getByTestId('cart-item-qty');
    this.remove = root.getByRole('button', { name: 'Remove', exact: true });
    this.decrease = root.getByRole('button', { name: 'Decrease quantity', exact: true });
    this.increase = root.getByRole('button', { name: 'Increase quantity', exact: true });
    this.notice = root.getByTestId('cart-item-notice');
    this.lowStock = root.getByTestId('cart-item-low-stock');
    this.image = root.getByRole('img');
    /** Link bọc ảnh (tới `/t/<slug>`); dòng sản phẩm ngừng bán thì không có. */
    this.imageLink = root.getByRole('link').filter({ has: root.page().getByRole('img') });
  }

  /** `data-size-id` của dòng. */
  async sizeId() {
    return Number(await this.root.getAttribute('data-size-id'));
  }
}

/**
 * Trang giỏ hàng `/cart` (plan gio-hang §6.4 → §6.10): danh sách dòng, Summary, "Checkout",
 * giỏ trống / skeleton / lỗi, "You Might Also Like", tóm tắt + nút dính đáy trên mobile.
 */
export class CartPage extends BasePage {
  path = '/cart';

  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);
    this.header = new HeaderComponent(page);
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.list = this.main.getByRole('list', { name: 'Bag items', exact: true });
    this.items = this.main.getByTestId('cart-item');

    // Trạng thái (§6.7)
    this.empty = page.getByTestId('cart-empty');
    this.shopAllShoes = this.main.getByRole('link', { name: 'Shop All Shoes', exact: true });
    this.skeleton = page.getByTestId('cart-skeleton');
    this.error = this.main.getByText("Couldn't load your bag.", { exact: true });
    // Lỗi tải giỏ thì không có dòng mua được → không có "You Might Also Like" (nút Try Again duy nhất)
    this.tryAgain = this.main.getByRole('button', { name: 'Try Again', exact: true });

    // Summary (§6.6)
    this.summary = page.getByTestId('cart-summary');
    this.summaryHeading = this.main.getByRole('heading', { name: 'Summary', exact: true });
    this.subtotal = page.getByTestId('cart-subtotal');
    this.shipping = page.getByTestId('cart-shipping');
    this.total = page.getByTestId('cart-total');
    this.deliveryHint = page.getByTestId('cart-delivery-hint');
    this.checkout = page.getByTestId('cart-checkout');
    this.mobileSummary = page.getByTestId('cart-mobile-summary');

    // "You Might Also Like" (§6.10)
    this.related = page.getByTestId('related-products');
    this.relatedCards = this.related.getByTestId('product-card');
  }

  /** Dòng thứ `i` (0-based). @param {number} i */
  item(i) {
    return new CartItem(this.items.nth(i));
  }

  /** Dòng theo size id. @param {number} sizeId */
  itemBySizeId(sizeId) {
    return new CartItem(this.main.locator(`[data-testid="cart-item"][data-size-id="${sizeId}"]`));
  }

  /** `data-size-id` của mọi dòng theo thứ tự. */
  async sizeIds() {
    const ids = await this.items.evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-size-id'))
    );
    return ids.map(Number);
  }

  /** Mở danh sách size của dòng `i` (0-based). @param {number} i */
  async openSizeSelect(i) {
    await this.item(i).size.click();
    await expect(this.page.getByRole('listbox')).toBeVisible();
  }

  /** Các mục trong danh sách size đang mở. */
  sizeOptions() {
    return this.page.getByRole('listbox').getByRole('option');
  }

  /** Chọn size `label` (vd "EU 43") ở dòng `i` (0-based). @param {number} i @param {string} label */
  async chooseSize(i, label) {
    await this.openSizeSelect(i);
    await this.page.getByRole('listbox').getByRole('option', { name: label, exact: true }).click();
  }

  /** Tên các thẻ "You Might Also Like" theo thứ tự. */
  relatedNames() {
    return this.relatedCards.getByTestId('product-name').allTextContents();
  }
}
