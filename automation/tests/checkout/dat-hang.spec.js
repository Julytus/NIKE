/* global document, window -- dùng trong page.evaluate (chạy ở trình duyệt) */
import checkoutInvalid from '../../data/checkout-form-invalid.json' with { type: 'json' };
import { accountNames, accounts, storageStateOf } from '../../data/accounts.js';
import {
  DELIVERY,
  ORDER_CODE_RE,
  PEGASUS_LANES,
  onlyLeftMessage,
  orderBody,
} from '../../data/orders.js';
import { expect, test } from '../../fixtures/index.js';
import { OrderResultPage } from '../../pages/OrderResultPage.js';
import { readCart, setCart } from '../../utils/cart-storage.js';
import { docShot } from '../../utils/doc-shot.js';
import { laneOf } from '../../utils/lane.js';
import { abortRoute, apiPath, collectPageErrors, sleep } from '../../utils/network.js';
import { scanVietnamese } from '../../utils/vietnamese.js';

/**
 * Lát `dat-hang` (plan/dat-hang.md §6, §9 TC-14 → TC-23): trang `/checkout` thật (bắt đăng nhập, form giao hàng,
 * "Cash on Delivery", "Order Summary", "Place Order", lỗi tồn kho / mạng, giỏ trống) và trang xác nhận
 * `/checkout/result/$code`. Thuộc pha `@stock` (tạo đơn làm đổi tồn kho). Giỏ chuẩn bị bằng `setCart`;
 * khách đăng nhập sẵn bằng storageState `khach1` / `khach2`. Desktop bỏ qua mobile-chrome; TC-23 chỉ mobile.
 * TC-24 (hồi quy) = chạy lại gio-hang, tieng-anh-cua-hang, chi-tiet-giay + `pnpm test:smoke`, `pnpm test:api`.
 */

const MOBILE = 'mobile-chrome';
const CREATE_URL = apiPath('/shop-order/create');
const GET_URL = apiPath('/shop-order/get');
const CHECK_URL = apiPath('/cart/public/check');
const AF1 = 'nike-air-force-1-07';
const AF1_NAME = "Nike Air Force 1 '07";
const EXCLUDED_TEXT =
  "Some items in your bag aren't available and won't be included in this order.";
const ADJUSTED_TEXT = "We've updated some quantities to match available stock.";
const NETWORK_ERROR = "Couldn't place your order. Please check your connection and try again.";
const SERVER_ERROR = 'Something went wrong. Please try again later';
const NOT_FOUND_CODE = 'DH2611190001';

/** @typedef {import('@playwright/test').Page} Page */

/**
 * Ghi lại các request `POST …/shop-order/create` (body JSON) và số request `check` của giỏ.
 * @param {Page} page
 */
function watchOrders(page) {
  const state = { creates: /** @type {Record<string, any>[]} */ ([]), checks: 0 };
  page.on('request', (req) => {
    if (req.method() !== 'POST') return;
    const path = new URL(req.url()).pathname;
    if (CREATE_URL.test(path)) state.creates.push(req.postDataJSON());
    if (CHECK_URL.test(path)) state.checks += 1;
  });
  return state;
}

/** Pathname hiện tại. @param {Page} page */
const pathOf = (page) => new URL(page.url()).pathname;

/**
 * Chờ sang trang xác nhận, trả mã đơn trên URL.
 * @param {Page} page
 */
async function waitForResult(page) {
  await expect.poll(() => pathOf(page)).toMatch(/^\/checkout\/result\/DH\d{10}$/);
  const code = pathOf(page).split('/').pop() ?? '';
  expect(code).toMatch(ORDER_CODE_RE);
  return code;
}

/**
 * Mở thêm một context đăng nhập sẵn bằng `role` với cùng cấu hình project (baseURL, viewport…).
 * @param {import('@playwright/test').Browser} browser
 * @param {import('@playwright/test').TestInfo} testInfo
 * @param {'khach1' | 'khach2'} role
 */
async function openAs(browser, testInfo, role) {
  const u = testInfo.project.use;
  const context = await browser.newContext({
    baseURL: u.baseURL,
    locale: u.locale,
    timezoneId: u.timezoneId,
    viewport: u.viewport,
    userAgent: u.userAgent,
    deviceScaleFactor: u.deviceScaleFactor,
    isMobile: u.isMobile,
    hasTouch: u.hasTouch,
    storageState: storageStateOf(role),
  });
  return { context, page: await context.newPage() };
}

/** Bề rộng cuộn của trang không vượt màn hình. @param {Page} page */
async function expectNoHorizontalScroll(page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
}

test.describe('Đặt hàng — chưa đăng nhập @stock', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === MOBILE, 'luồng desktop');
  });

  test(
    'TC-14 đặt COD từ trang chi tiết (chưa đăng nhập)',
    { tag: '@smoke' },
    async (
      {
        page,
        productDetailPage: pdp,
        signInPage,
        checkoutPage: checkout,
        orderResultPage: result,
        apiAs,
      },
      testInfo
    ) => {
      const errors = collectPageErrors(page);
      const watch = watchOrders(page);

      await test.step('chọn EU 42, Add to Bag, Checkout → /signin?redirect=/checkout', async () => {
        await pdp.goto(AF1);
        await pdp.addSize('EU 42');
        await expect(pdp.addedToBag.checkout).toBeVisible();
        await pdp.addedToBag.checkout.click();
        await expect.poll(() => pathOf(page)).toBe('/signin');
        expect(new URL(page.url()).searchParams.get('redirect')).toBe('/checkout');
      });

      await test.step('đăng nhập khach1 → /checkout', async () => {
        await signInPage.signIn(accounts.khach1);
        await expect.poll(() => pathOf(page)).toBe('/checkout');
        await expect(page).toHaveTitle('Checkout | Nike');
        await expect(checkout.heading).toHaveText('Checkout');
      });

      await test.step('form + Order Summary', async () => {
        await expect(checkout.fullName).toHaveValue(accountNames.khach1);
        await expect(checkout.cod).toBeChecked();
        await expect(checkout.items).toHaveCount(1);
        const line = checkout.item(0);
        await expect(line.name).toHaveText(AF1_NAME);
        await expect(line.size).toHaveText('Size EU 42');
        await expect(line.qty).toHaveText('Qty 1');
        await expect(line.price).toHaveText('2.929.000 ₫');
        await expect(checkout.subtotal).toHaveText('2.929.000 ₫');
        await expect(checkout.shipping).toHaveText('30.000 ₫');
        await expect(checkout.total).toHaveText('2.959.000 ₫');
        await expect(checkout.placeOrder).toBeEnabled();
        expect(await scanVietnamese(checkout.main)).toEqual([]);
      });

      await test.step('nhập giao hàng, Place Order', async () => {
        await checkout.fillDelivery({
          phone: DELIVERY.phone,
          address: DELIVERY.address,
          note: DELIVERY.note,
        });
        await docShot(page, testInfo, '01-checkout');
        await checkout.placeOrder.click();
      });

      const code = await waitForResult(page);

      await test.step('trang xác nhận', async () => {
        expect(watch.creates).toHaveLength(1);
        expect(watch.creates[0].items).toEqual([{ sizeId: 106, quantity: 1 }]);
        await expect(page).toHaveTitle('Order Confirmation | Nike');
        await expect(result.heading).toHaveText('Thank you for your order');
        await expect(result.code).toHaveText(code);
        await expect(result.payNote).toHaveText('Pay 2.959.000 ₫ in cash when your order arrives.');
        await expect(result.receiver).toHaveText(accountNames.khach1);
        await expect(result.phone).toHaveText(DELIVERY.phone);
        await expect(result.address).toHaveText(DELIVERY.address);
        await expect(result.note).toHaveText(DELIVERY.note);
        await expect(result.itemsHeading).toHaveText('Items (1)');
        await expect(result.items).toHaveCount(1);
        await expect(result.item(0).name).toHaveText(AF1_NAME);
        await expect(result.item(0).size).toHaveText('Size EU 42');
        await expect(result.item(0).qty).toHaveText('Qty 1');
        await expect(result.item(0).price).toHaveText('2.929.000 ₫');
        await expect(result.shipping).toHaveText('30.000 ₫');
        await expect(result.total).toHaveText('2.959.000 ₫');
        await expect(result.payment).toHaveText('Cash on Delivery');
        await expect(result.header.cartCount).toHaveCount(0);
        expect(await readCart(page)).toEqual([]);
        expect(await scanVietnamese(result.main)).toEqual([]);
        await docShot(page, testInfo, '05-xac-nhan');
      });

      await test.step('API: đơn đã lưu', async () => {
        const khach1 = await apiAs('khach1');
        const order = await khach1.client.expectOk(await khach1.order.get(code));
        expect(order).toMatchObject({ status: 'PLACED', total: 2959000 });
      });

      expect(errors).toEqual([]);
    }
  );

  test(
    'TC-16 bắt đăng nhập ở route',
    { tag: '@regression' },
    async ({ page, signInPage, orderResultPage: result }) => {
      await page.goto('/checkout', { waitUntil: 'load' });
      await expect.poll(() => pathOf(page)).toBe('/signin');
      expect(new URL(page.url()).searchParams.get('redirect')).toBe('/checkout');

      // WebKit báo trễ lần redirect (replaceState) sang /signin, cắt ngang goto kế tiếp → về about:blank trước (§12)
      await page.goto('about:blank');
      await result.goto(NOT_FOUND_CODE);
      await expect.poll(() => pathOf(page)).toBe('/signin');
      expect(new URL(page.url()).searchParams.get('redirect')).toBe(
        `/checkout/result/${NOT_FOUND_CODE}`
      );

      await signInPage.signIn(accounts.khach1);
      await expect.poll(() => pathOf(page)).toBe(`/checkout/result/${NOT_FOUND_CODE}`);
      await expect(result.notFound).toBeVisible();
      await expect(result.heading).toHaveText('Order Not Found');
      await expect(result.notFoundText).toBeVisible();
      await expect(result.continueShopping).toHaveAttribute('href', '/w');
    }
  );
});

test.describe('Đặt hàng — khach1 (desktop) @stock', () => {
  test.use({ storageState: storageStateOf('khach1') });

  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === MOBILE, 'luồng desktop');
  });

  test(
    'TC-18 tồn kho đổi trước khi bấm Place Order',
    { tag: '@regression' },
    async ({ page, checkoutPage: checkout, orderResultPage: result, apiAs, api }, testInfo) => {
      const size = PEGASUS_LANES[laneOf(testInfo)];
      const admin = await apiAs('admin');
      await admin.testSupport.setStockOk(size, 2);
      await setCart(page, [{ sizeId: size, quantity: 2 }]);
      await checkout.goto();

      await expect(checkout.item(0).qty).toHaveText('Qty 2');
      await expect(checkout.total).toHaveText('7.658.000 ₫');
      await expect(checkout.shipping).toHaveText('Free');

      await admin.testSupport.setStockOk(size, 1);
      await checkout.fillDelivery(DELIVERY);
      await checkout.placeOrder.click();

      await test.step('lần 1: lỗi tồn kho, trang tự giảm số lượng', async () => {
        await expect(checkout.error).toHaveText(onlyLeftMessage(size, 1));
        expect(pathOf(page)).toBe('/checkout');
        await expect(checkout.item(0).qty).toHaveText('Qty 1');
        await expect(checkout.shipping).toHaveText('30.000 ₫');
        await expect(checkout.total).toHaveText('3.859.000 ₫');
        await expect(checkout.adjustedNotice).toHaveText(ADJUSTED_TEXT);
        await expect.poll(() => readCart(page)).toEqual([{ sizeId: size, quantity: 1 }]);
        await docShot(page, testInfo, '03-loi-ton-kho');
      });

      await test.step('lần 2: đặt được', async () => {
        await expect(checkout.placeOrder).toBeEnabled();
        await checkout.placeOrder.click();
        await waitForResult(page);
        await expect(result.item(0).qty).toHaveText('Qty 1');
        await expect(result.total).toHaveText('3.859.000 ₫');
      });

      const detail = await api.client.expectOk(await api.product.get('nike-pegasus-42'));
      expect(detail.sizes.find((/** @type {{ id: number }} */ s) => s.id === size).stock).toBe(0);
    }
  );

  test(
    'TC-19 giỏ có dòng không mua được',
    { tag: '@regression' },
    async ({ page, checkoutPage: checkout, orderResultPage: result }, testInfo) => {
      const watch = watchOrders(page);
      await setCart(page, [
        { sizeId: 406, quantity: 1 },
        { sizeId: 201, quantity: 1 },
        { sizeId: 3106, quantity: 1 },
      ]);
      await checkout.goto();

      await expect(checkout.items).toHaveCount(1);
      expect(await checkout.sizeIds()).toEqual([406]);
      const line = checkout.item(0);
      await expect(line.name).toHaveText('Nike Waffle Racer');
      await expect(line.size).toHaveText('Size EU 42');
      await expect(line.price).toHaveText('2.119.000 ₫');
      await expect(line.originalPrice).toHaveText('2.649.000 ₫');
      await expect(checkout.excludedNotice).toHaveText(EXCLUDED_TEXT);
      await expect(checkout.subtotal).toHaveText('2.119.000 ₫');
      await expect(checkout.shipping).toHaveText('30.000 ₫');
      await expect(checkout.total).toHaveText('2.149.000 ₫');
      await checkout.fillDelivery(DELIVERY);
      await docShot(page, testInfo, '04-dong-khong-mua-duoc');

      await checkout.placeOrder.click();
      await waitForResult(page);
      expect(watch.creates).toHaveLength(1);
      expect(watch.creates[0].items).toEqual([{ sizeId: 406, quantity: 1 }]);
      expect(await readCart(page)).toEqual([
        { sizeId: 201, quantity: 1 },
        { sizeId: 3106, quantity: 1 },
      ]);
      await expect(result.header.cartCount).toHaveText('2');
    }
  );

  test(
    'TC-20 giỏ trống / không còn gì để đặt',
    { tag: '@regression' },
    async ({ page, checkoutPage: checkout, productListPage: list, cartPage }) => {
      const watch = watchOrders(page);

      await test.step('ca 1: chưa có nike.cart', async () => {
        await checkout.goto();
        await expect(checkout.heading).toHaveText('Checkout');
        await expect(checkout.empty).toContainText('Your bag is empty.');
        await expect(checkout.placeOrder).toHaveCount(0);
        expect(watch.checks).toBe(0);
        expect(watch.creates).toHaveLength(0);
        await checkout.shopAllShoes.click();
        await expect.poll(() => pathOf(page)).toBe('/w');
        await expect(list.heading).toHaveText('Shoes (30)');
      });

      await test.step('ca 2: chỉ có dòng hết hàng', async () => {
        await setCart(page, [{ sizeId: 201, quantity: 1 }]);
        await checkout.goto();
        await expect(checkout.empty).toContainText(
          'None of the items in your bag are available right now.'
        );
        await expect(checkout.placeOrder).toHaveCount(0);
        await checkout.goToBag.click();
        await expect.poll(() => pathOf(page)).toBe('/cart');
        await expect(cartPage.heading).toBeVisible();
      });

      expect(watch.creates).toHaveLength(0);
    }
  );

  test(
    'TC-21 lỗi mạng, chậm, bấm hai lần',
    { tag: '@regression' },
    async ({ page, checkoutPage: checkout, orderResultPage: result }) => {
      await setCart(page, [{ sizeId: 107, quantity: 1 }]);
      await checkout.goto();
      await expect(checkout.items).toHaveCount(1);
      await checkout.fillDelivery(DELIVERY);

      await test.step('(a) server 500', async () => {
        await page.route(CREATE_URL, (route) =>
          route.fulfill({
            status: 500,
            json: { code: 500, errorCode: 'INTERNAL_ERROR', message: SERVER_ERROR },
          })
        );
        await checkout.placeOrder.click();
        await expect(checkout.error).toHaveText(SERVER_ERROR);
        expect(pathOf(page)).toBe('/checkout');
        expect(await readCart(page)).toEqual([{ sizeId: 107, quantity: 1 }]);
        await expect(checkout.placeOrder).toBeEnabled();
        await page.unroute(CREATE_URL);
      });

      await test.step('(b) mất mạng', async () => {
        await page.route(CREATE_URL, abortRoute);
        await checkout.placeOrder.click();
        await expect(checkout.error).toHaveText(NETWORK_ERROR);
        await expect(checkout.placeOrder).toBeEnabled();
        await page.unroute(CREATE_URL);
      });

      await test.step('(c) chậm 1,5 giây + bấm hai lần → một request', async () => {
        let forwarded = 0;
        await page.route(CREATE_URL, async (route) => {
          forwarded += 1;
          await sleep(1_500);
          await route.continue();
        });
        await checkout.placeOrder.dblclick();
        await expect(checkout.placeOrder).toHaveText('Placing Order…');
        await expect(checkout.placeOrder).toBeDisabled();
        await expect(checkout.placeOrder).toHaveAttribute('aria-busy', 'true');
        await expect(checkout.error).toHaveCount(0);
        await waitForResult(page);
        expect(forwarded).toBe(1);
        await expect(result.item(0).name).toHaveText(AF1_NAME);
        await expect(result.item(0).size).toHaveText('Size EU 42.5');
      });
    }
  );

  test(
    'TC-22 trang xác nhận: không phải của mình / lỗi tải',
    { tag: '@regression' },
    async ({ page, browser, apiAs, orderResultPage: result }, testInfo) => {
      const khach1 = await apiAs('khach1');
      const order = await khach1.client.expectOk(
        await khach1.order.create(orderBody([{ sizeId: 108, quantity: 1 }]))
      );

      await test.step('khach2 mở đơn của khach1 → Order Not Found', async () => {
        const other = await openAs(browser, testInfo, 'khach2');
        const otherResult = new OrderResultPage(other.page);
        await otherResult.goto(order.code);
        await expect(otherResult.notFound).toBeVisible();
        await expect(otherResult.heading).toHaveText('Order Not Found');
        await expect(otherResult.code).toHaveCount(0);
        await other.context.close();
      });

      await test.step('khach1: lỗi tải → Try Again', async () => {
        await page.route(GET_URL, (route) =>
          route.fulfill({ status: 500, json: { code: 500, message: 'Simulated error' } })
        );
        await result.goto(order.code);
        await expect(result.error).toBeVisible();
        await expect(result.tryAgain).toBeVisible();
        await page.unroute(GET_URL);
        await result.tryAgain.click();
        await expect(result.code).toHaveText(order.code);
        await expect(result.items).toHaveCount(1);
        await expect(result.item(0).size).toHaveText('Size EU 43');
        await expect(result.total).toHaveText('2.959.000 ₫');
      });
    }
  );
});

test.describe('Đặt hàng — khach2 (desktop) @stock', () => {
  test.use({ storageState: storageStateOf('khach2') });

  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === MOBILE, 'luồng desktop');
  });

  test(
    'TC-15 nhiều dòng, miễn phí giao hàng, Back sau khi đặt',
    { tag: '@regression' },
    async ({ page, checkoutPage: checkout, orderResultPage: result }) => {
      await setCart(page, [
        { sizeId: 109, quantity: 2 },
        { sizeId: 306, quantity: 1 },
      ]);
      await checkout.goto();

      await expect(checkout.fullName).toHaveValue(accountNames.khach2);
      await expect(checkout.items).toHaveCount(2);
      expect(await checkout.sizeIds()).toEqual([109, 306]);
      await expect(checkout.item(0).name).toHaveText(AF1_NAME);
      await expect(checkout.item(0).size).toHaveText('Size EU 44');
      await expect(checkout.item(0).qty).toHaveText('Qty 2');
      await expect(checkout.item(0).price).toHaveText('5.858.000 ₫');
      await expect(checkout.item(1).name).toHaveText('Nike Marina');
      await expect(checkout.item(1).size).toHaveText('Size EU 42');
      await expect(checkout.item(1).qty).toHaveText('Qty 1');
      await expect(checkout.item(1).price).toHaveText('769.000 ₫');
      await expect(checkout.subtotal).toHaveText('6.627.000 ₫');
      await expect(checkout.shipping).toHaveText('Free');
      await expect(checkout.total).toHaveText('6.627.000 ₫');

      await checkout.fillDelivery({ phone: DELIVERY.phone, address: DELIVERY.address });
      await checkout.placeOrder.click();
      await waitForResult(page);

      await expect(result.itemsHeading).toHaveText('Items (3)');
      await expect(result.items).toHaveCount(2);
      expect(await result.sizeIds()).toEqual([109, 306]);
      await expect(result.shipping).toHaveText('Free');
      await expect(result.total).toHaveText('6.627.000 ₫');
      await expect(result.receiver).toHaveText(accountNames.khach2);
      await expect(result.note).toHaveCount(0);

      await page.goBack();
      await expect.poll(() => pathOf(page)).toBe('/');
    }
  );

  test(
    'TC-17 validate form',
    { tag: '@regression' },
    async ({ page, checkoutPage: checkout }, testInfo) => {
      const watch = watchOrders(page);
      await setCart(page, [{ sizeId: 105, quantity: 1 }]);
      await checkout.goto();
      await expect(checkout.fullName).toHaveValue(accountNames.khach2);
      await expect(checkout.placeOrder).toBeEnabled();

      await test.step('(1) ba ô bắt buộc trống', async () => {
        await checkout.fillDelivery({ receiverName: null, phone: null, address: null });
        await checkout.placeOrder.click();
        await expect(checkout.fieldError(checkout.fullName)).toHaveText(
          "Please enter the recipient's name."
        );
        await expect(checkout.fieldError(checkout.phone)).toHaveText(
          'Please enter a phone number.'
        );
        await expect(checkout.fieldError(checkout.address)).toHaveText(
          'Please enter a delivery address.'
        );
        for (const input of [checkout.fullName, checkout.phone, checkout.address]) {
          await expect(input).toHaveAttribute('aria-invalid', 'true');
        }
        await expect(checkout.fullName).toBeFocused();
        await docShot(page, testInfo, '02-loi-validate');

        await checkout.fullName.fill(accountNames.khach2);
        await expect(checkout.fieldError(checkout.fullName)).toHaveCount(0);
        await expect(checkout.fieldError(checkout.phone)).toBeVisible();
        await expect(checkout.fieldError(checkout.address)).toBeVisible();
      });

      for (const c of checkoutInvalid.cases) {
        await test.step(c.name, async () => {
          await checkout.fillDelivery({ ...DELIVERY, receiverName: accountNames.khach2 });
          const input = /** @type {import('@playwright/test').Locator} */ (
            checkout[/** @type {'fullName' | 'phone' | 'address' | 'notes'} */ (c.field)]
          );
          await input.fill(c.value ?? 'a'.repeat(c.length ?? 0));
          await checkout.placeOrder.click();
          await expect(checkout.fieldError(input)).toHaveText(c.message);
          await expect(input).toHaveAttribute('aria-invalid', 'true');
        });
      }
      expect(watch.creates).toHaveLength(0);

      await test.step('(9) biên hợp lệ', async () => {
        await checkout.fillDelivery({
          receiverName: 'N'.repeat(100),
          phone: '0901 234 567',
          address: 'A'.repeat(255),
          note: 'n'.repeat(255),
        });
        await checkout.placeOrder.click();
        await waitForResult(page);
        expect(watch.creates).toHaveLength(1);
        expect(watch.creates[0].phone).toBe('0901234567');
        expect(watch.creates[0].receiverName).toHaveLength(100);
        expect(watch.creates[0].note).toHaveLength(255);
      });
    }
  );
});

test.describe('Đặt hàng — mobile @stock', () => {
  test.use({ storageState: storageStateOf('khach1') });

  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== MOBILE, 'chỉ mobile');
  });

  test(
    'TC-23 bố cục mobile',
    { tag: '@regression' },
    async ({ page, checkoutPage: checkout, orderResultPage: result }, testInfo) => {
      await setCart(page, [{ sizeId: 110, quantity: 1 }]);
      await checkout.goto();
      await expect(checkout.items).toHaveCount(1);

      const delivery = await checkout.delivery.boundingBox();
      const summary = await checkout.summary.boundingBox();
      expect(delivery && summary).toBeTruthy();
      expect((delivery?.y ?? 0) + (delivery?.height ?? 0)).toBeLessThanOrEqual(summary?.y ?? 0);
      const innerWidth = await page.evaluate(() => window.innerWidth);
      const address = await checkout.address.boundingBox();
      expect(Math.abs((address?.width ?? 0) - (innerWidth - 32))).toBeLessThanOrEqual(2);
      await expectNoHorizontalScroll(page);
      expect(await scanVietnamese(checkout.main)).toEqual([]);
      await docShot(page, testInfo, '06-checkout-mobile');

      await checkout.fillDelivery(DELIVERY);
      await checkout.placeOrder.scrollIntoViewIfNeeded();
      await checkout.placeOrder.click();
      const code = await waitForResult(page);

      await expect(result.code).toHaveText(code);
      await expect(result.item(0).size).toHaveText('Size EU 44.5');
      await expectNoHorizontalScroll(page);
      expect(await scanVietnamese(result.main)).toEqual([]);
      await docShot(page, testInfo, '07-xac-nhan-mobile');
    }
  );
});
