import { BasePage } from './BasePage.js';
import { HeaderComponent } from './components/HeaderComponent.js';

/**
 * Một dòng của "Order Summary" (`<li data-testid="checkout-item" data-size-id>`) — plan dat-hang §6.5.
 */
export class CheckoutItem {
  /** @param {import('@playwright/test').Locator} root */
  constructor(root) {
    this.root = root;
    this.name = root.getByTestId('checkout-item-name');
    this.size = root.getByTestId('checkout-item-size');
    this.qty = root.getByTestId('checkout-item-qty');
    this.price = root.getByTestId('checkout-item-price');
    this.originalPrice = root.getByTestId('checkout-item-original-price');
    this.image = root.getByRole('img');
  }

  /** `data-size-id` của dòng. */
  async sizeId() {
    return Number(await this.root.getAttribute('data-size-id'));
  }
}

/**
 * Trang `/checkout` (plan dat-hang §6.2 → §6.7): Delivery (form giao hàng), Payment ("Cash on Delivery"),
 * Order Summary (dòng mua được, tổng, thông báo, lỗi, "Place Order"), giỏ trống / skeleton / lỗi tải.
 */
export class CheckoutPage extends BasePage {
  path = '/checkout';

  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);
    this.header = new HeaderComponent(page);
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1 });

    // Delivery (§6.3)
    this.delivery = page.getByTestId('checkout-delivery');
    this.fullName = this.main.getByLabel('Full Name', { exact: true });
    this.phone = this.main.getByLabel('Phone Number', { exact: true });
    this.address = this.main.getByLabel('Address', { exact: true });
    this.notes = this.main.getByLabel('Delivery Notes', { exact: true });

    // Payment (§6.4)
    this.paymentSection = page.getByTestId('checkout-payment');
    this.payment = this.main.getByRole('radiogroup', { name: 'Payment Method', exact: true });
    this.cod = this.payment.getByRole('radio', { name: 'Cash on Delivery', exact: true });

    // Order Summary (§6.5)
    this.summary = page.getByTestId('checkout-summary');
    this.itemList = this.main.getByRole('list', { name: 'Order items', exact: true });
    this.items = this.main.getByTestId('checkout-item');
    this.subtotal = page.getByTestId('checkout-subtotal');
    this.shipping = page.getByTestId('checkout-shipping');
    this.total = page.getByTestId('checkout-total');
    this.excludedNotice = page.getByTestId('checkout-excluded-notice');
    this.adjustedNotice = page.getByTestId('checkout-adjusted-notice');
    this.error = page.getByTestId('checkout-error');
    this.placeOrder = page.getByTestId('checkout-place-order');
    this.editBag = this.main.getByRole('link', { name: 'Edit Bag', exact: true });

    // Trạng thái trang (§6.6)
    this.empty = page.getByTestId('checkout-empty');
    this.shopAllShoes = this.main.getByRole('link', { name: 'Shop All Shoes', exact: true });
    this.goToBag = this.main.getByRole('link', { name: 'Go to Bag', exact: true });
    this.skeleton = page.getByTestId('checkout-skeleton');
    this.loadError = this.main.getByText("Couldn't load your bag.", { exact: true });
    this.tryAgain = this.main.getByRole('button', { name: 'Try Again', exact: true });
  }

  /** Dòng thứ `i` (0-based). @param {number} i */
  item(i) {
    return new CheckoutItem(this.items.nth(i));
  }

  /** `data-size-id` của mọi dòng theo thứ tự. */
  async sizeIds() {
    const ids = await this.items.evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-size-id'))
    );
    return ids.map(Number);
  }

  /**
   * Lỗi validate dưới ô (`<p id="…-error">` của `ShopField`, nối bằng `aria-describedby`).
   * @param {import('@playwright/test').Locator} input
   */
  fieldError(input) {
    return input.locator('xpath=ancestor::div[2]').locator('p[id$="-error"]');
  }

  /**
   * Điền form giao hàng; field nào `undefined` thì bỏ qua (giữ nguyên ô), `null` → xoá trống.
   * @param {{ receiverName?: string | null, phone?: string | null, address?: string | null, note?: string | null }} d
   */
  async fillDelivery(d) {
    /** @type {[import('@playwright/test').Locator, string | null | undefined][]} */
    const pairs = [
      [this.fullName, d.receiverName],
      [this.phone, d.phone],
      [this.address, d.address],
      [this.notes, d.note],
    ];
    for (const [input, value] of pairs) {
      if (value !== undefined) await input.fill(value ?? '');
    }
  }
}
