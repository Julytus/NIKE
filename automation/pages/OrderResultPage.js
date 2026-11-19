import { BasePage } from './BasePage.js';
import { HeaderComponent } from './components/HeaderComponent.js';

/**
 * Một dòng của đơn (`<li data-testid="order-item" data-size-id>`) — plan dat-hang §6.8.
 */
export class OrderItem {
  /** @param {import('@playwright/test').Locator} root */
  constructor(root) {
    this.root = root;
    this.name = root.getByTestId('order-item-name');
    this.size = root.getByTestId('order-item-size');
    this.qty = root.getByTestId('order-item-qty');
    this.price = root.getByTestId('order-item-price');
    this.image = root.getByRole('img');
  }

  /** `data-size-id` của dòng. */
  async sizeId() {
    return Number(await this.root.getAttribute('data-size-id'));
  }
}

/**
 * Trang xác nhận đơn `/checkout/result/$code` (plan dat-hang §6.8): "Thank you for your order", mã đơn,
 * giao tới, dòng, tổng; "Order Not Found"; skeleton / lỗi tải.
 */
export class OrderResultPage extends BasePage {
  path = '/checkout/result';

  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);
    this.header = new HeaderComponent(page);
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1 });

    this.result = page.getByTestId('order-result');
    this.code = page.getByTestId('order-code');
    this.payNote = page.getByTestId('order-pay-note');
    this.deliveryHeading = this.main.getByRole('heading', {
      name: 'Delivery Details',
      exact: true,
    });
    this.receiver = page.getByTestId('order-receiver');
    this.phone = page.getByTestId('order-phone');
    this.address = page.getByTestId('order-address');
    this.note = page.getByTestId('order-note');
    this.itemsHeading = this.main.getByRole('heading', { name: /^Items \(\d+\)$/ });
    this.itemList = this.main.getByRole('list', { name: 'Order items', exact: true });
    this.items = this.main.getByTestId('order-item');
    this.subtotal = page.getByTestId('order-subtotal');
    this.shipping = page.getByTestId('order-shipping');
    this.total = page.getByTestId('order-total');
    this.payment = page.getByTestId('order-payment');
    this.continueShopping = this.main.getByRole('link', { name: 'Continue Shopping', exact: true });

    this.notFound = page.getByTestId('order-not-found');
    this.notFoundText = this.main.getByText("We couldn't find this order in your account.", {
      exact: true,
    });
    this.error = this.main.getByText("Couldn't load your order.", { exact: true });
    this.tryAgain = this.main.getByRole('button', { name: 'Try Again', exact: true });
    this.skeleton = page.getByTestId('order-skeleton');
  }

  /** Mở trang xác nhận của đơn `code`. @param {string} code */
  async goto(code) {
    await super.goto(`${this.path}/${code}`);
  }

  /** Dòng thứ `i` (0-based). @param {number} i */
  item(i) {
    return new OrderItem(this.items.nth(i));
  }

  /** `data-size-id` của mọi dòng theo thứ tự. */
  async sizeIds() {
    const ids = await this.items.evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-size-id'))
    );
    return ids.map(Number);
  }
}
