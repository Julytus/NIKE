import { accountNames, accounts, storageStateOf } from '../../data/accounts.js';
import { DELIVERY, FLOW_STOCK, NEW_CUSTOMER_NAME, flowOf } from '../../data/flows.js';
import { ORDER_CODE_RE } from '../../data/orders.js';
import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FEE,
  catalogTitle,
  expectedList,
  seedSizeOf,
} from '../../data/seed-products.js';
import { expect, test } from '../../fixtures/index.js';
import { readCart, setCart } from '../../utils/cart-storage.js';
import { docShot } from '../../utils/doc-shot.js';
import { formatVnd } from '../../utils/format.js';
import { apiPath, collectPageErrors, countRequests, failOnce } from '../../utils/network.js';
import { uniqueEmail } from '../../utils/unique.js';

/**
 * Lát `kiem-thu-hoi-quy` (plan/kiem-thu-hoi-quy.md §3, §9.1 TC-01 → TC-05b): luồng mua hàng xuyên nhiều lát
 * (tìm → lọc → chi tiết → giỏ → đăng nhập / tạo tài khoản → đặt COD), mỗi luồng kiểm thêm qua API (đơn,
 * tồn kho). Mỗi luồng một sản phẩm + một size riêng theo project (`flowOf`, plan §4) nên 4 trình duyệt chạy
 * song song không giẫm tồn kho. Lát sau nối thêm bước (vd 2.4 "xem đơn") — xem tests/e2e-flows/README.md.
 */

const MOBILE = 'mobile-chrome';
const PASSWORD = 'Admin@123';
const NETWORK_ERROR = "Couldn't place your order. Please check your connection and try again.";
const CREATE_URL = apiPath('/shop-order/create');
const REFRESH_URL = apiPath('/auth/refresh');
const SESSION_EXPIRED = { code: 401, message: 'Invalid or tampered token' };

/** @typedef {import('@playwright/test').Page} Page */
/** @typedef {import('../../api/index.js').Api} Api */

/** Pathname hiện tại. @param {Page} page */
const pathOf = (page) => new URL(page.url()).pathname;

/** Tồn kho hiện tại của một size (API công khai). @param {Api} api @param {number} sizeId */
async function stockNow(api, sizeId) {
  const found = seedSizeOf(sizeId);
  if (!found) throw new Error(`size ${sizeId} không có trong products.json`);
  const detail = await api.client.expectOk(await api.product.get(found.product.slug));
  return /** @type {number} */ (
    detail.sizes.find((/** @type {{ id: number }} */ s) => s.id === sizeId).stock
  );
}

/** Access token của trang (`auth-storage` ở localStorage / sessionStorage); không có → null. @param {Page} page */
function pageAccessToken(page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('auth-storage') ?? sessionStorage.getItem('auth-storage');
    return raw ? (JSON.parse(raw).state?.accessToken ?? null) : null;
  });
}

/** Chờ sang trang xác nhận, trả mã đơn. @param {Page} page */
async function waitForResult(page) {
  await expect
    .poll(() => pathOf(page), { timeout: 15_000 })
    .toMatch(/^\/checkout\/result\/DH\d{10}$/);
  const code = pathOf(page).split('/').pop() ?? '';
  expect(code).toMatch(ORDER_CODE_RE);
  return code;
}

/** Đang ở `/signin?redirect=/checkout`. @param {Page} page */
async function expectSignInForCheckout(page) {
  await expect.poll(() => pathOf(page)).toBe('/signin');
  expect(new URL(page.url()).searchParams.get('redirect')).toBe('/checkout');
}

/** Gợi ý miễn phí giao hàng của giỏ có tạm tính `subtotal`. @param {number} subtotal */
const hintOf = (subtotal) =>
  subtotal >= FREE_SHIPPING_THRESHOLD
    ? 'You qualify for free delivery.'
    : `Add ${formatVnd(FREE_SHIPPING_THRESHOLD - subtotal)} more to get free delivery.`;

/** Summary mong đợi cho tạm tính `subtotal`. @param {number} subtotal */
function summaryOf(subtotal) {
  const fee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  return {
    subtotal: formatVnd(subtotal),
    shipping: fee === 0 ? 'Free' : formatVnd(fee),
    total: formatVnd(subtotal + fee),
    hint: hintOf(subtotal),
    fee,
  };
}

test.describe('Luồng xuyên suốt @stock @flow', () => {
  test(
    'TC-01 F1 khách vãng lai: tìm → lọc → xem → thêm giỏ → đăng nhập → đặt COD',
    { tag: '@smoke' },
    async (
      {
        page,
        homePage,
        productListPage: list,
        productDetailPage: pdp,
        cartPage: cart,
        signInPage,
        checkoutPage: checkout,
        orderResultPage: result,
        api,
        apiAs,
      },
      testInfo
    ) => {
      const flow = flowOf('F1', testInfo);
      const sum = summaryOf(flow.price);
      const errors = collectPageErrors(page);
      const admin = await apiAs('admin');
      await admin.testSupport.setStockOk(flow.sizeId, FLOW_STOCK);
      const shot = (/** @type {string} */ name) =>
        docShot(page, testInfo, testInfo.project.name === MOBILE ? `${name}-mobile` : name);

      await test.step('tìm "vomero" ở header', async () => {
        await homePage.goto();
        await list.header.searchFor('vomero');
        await expect(list.eyebrow).toBeVisible();
        await expect(list.cards.getByTestId('product-name')).toContainText([flow.name]);
        await shot('01-tim-kiem');
      });

      await test.step(`lọc size ${flow.sizeLabel}`, async () => {
        const filter = { q: 'vomero', size: flow.sizeValue };
        await list.applyFilters([['size', flow.sizeValue]]);
        await list.expectUrlFilter(filter);
        expect(expectedList(filter).total).toBe(1);
        await expect(list.heading).toHaveText(`${catalogTitle(filter)} (1)`);
        await expect(list.cards).toHaveCount(1);
        await expect(list.card(0).name).toHaveText(flow.name);
        await shot('02-loc-size');
      });

      await test.step('xem chi tiết, chọn size, Add to Bag', async () => {
        await list.card(0).name.click();
        await expect.poll(() => pathOf(page)).toBe(`/t/${flow.slug}`);
        await pdp.addSize(flow.sizeLabel);
        const popup = pdp.addedToBag;
        await expect(popup.title).toBeVisible();
        await expect(popup.size).toHaveText(`Size ${flow.sizeLabel}`);
        await expect(popup.price).toHaveText(formatVnd(flow.price));
        await expect(popup.viewBagWith(1)).toBeVisible();
        await shot('03-them-gio');
      });

      await test.step('View Bag → giỏ chưa đủ miễn phí giao hàng', async () => {
        await pdp.addedToBag.viewBagWith(1).click();
        await expect.poll(() => pathOf(page)).toBe('/cart');
        await expect(cart.items).toHaveCount(1);
        await expect(cart.item(0).name).toHaveText(flow.name);
        await cart.expectSummary(sum);
        await shot('04-gio-hang');
      });

      await test.step('Checkout → /signin, đăng nhập khach1 → /checkout', async () => {
        await cart.checkout.click();
        await expectSignInForCheckout(page);
        await signInPage.signIn(accounts.khach1);
        await expect.poll(() => pathOf(page)).toBe('/checkout');
        await expect(checkout.items).toHaveCount(1);
        await expect(checkout.fullName).toHaveValue(accountNames.khach1);
      });

      await test.step('điền giao hàng, COD, Place Order', async () => {
        await checkout.fillDelivery({
          phone: DELIVERY.phone,
          address: DELIVERY.address,
          note: DELIVERY.note,
        });
        await expect(checkout.cod).toBeChecked();
        await shot('05-checkout');
        await checkout.placeOrder.click();
      });

      const code = await waitForResult(page);

      await test.step('trang xác nhận', async () => {
        await expect(result.heading).toHaveText('Thank you for your order');
        await expect(result.payNote).toHaveText(
          `Pay ${sum.total} in cash when your order arrives.`
        );
        await expect(result.items).toHaveCount(1);
        await expect(result.item(0).size).toHaveText(`Size ${flow.sizeLabel}`);
        await expect(result.header.cartCount).toHaveCount(0);
        expect(await readCart(page)).toEqual([]);
        await shot('06-xac-nhan');
      });

      await test.step('API: đơn của khach1, tồn kho giảm 1', async () => {
        const khach1 = await apiAs('khach1');
        const order = await khach1.client.expectOk(await khach1.order.get(code));
        expect(order.items).toHaveLength(1);
        expect(order.items[0]).toMatchObject({ sizeId: flow.sizeId, quantity: 1 });
        expect(order).toMatchObject({ shippingFee: sum.fee, total: flow.price + sum.fee });
        expect(await stockNow(api, flow.sizeId)).toBe(FLOW_STOCK - 1);
      });

      expect(errors).toEqual([]);
    }
  );

  test.describe('khách đã đăng nhập (khach2)', () => {
    test.use({ storageState: storageStateOf('khach2') });

    test(
      'TC-02 F2 menu → danh mục → sắp xếp → 2 đôi, miễn phí giao hàng',
      { tag: '@regression' },
      async (
        {
          page,
          homePage,
          productListPage: list,
          productDetailPage: pdp,
          cartPage: cart,
          checkoutPage: checkout,
          orderResultPage: result,
          api,
          apiAs,
        },
        testInfo
      ) => {
        test.skip(testInfo.project.name === MOBILE, 'mega menu chỉ có ở desktop');
        const flow = flowOf('F2', testInfo);
        const one = summaryOf(flow.price);
        const two = summaryOf(flow.price * 2);
        const errors = collectPageErrors(page);
        await (await apiAs('admin')).testSupport.setStockOk(flow.sizeId, FLOW_STOCK);

        await test.step('rê "Men" → mega menu → "Football"', async () => {
          await homePage.goto();
          await list.header.hoverNav('Men');
          await list.header.megaLink('Football').click();
          await list.expectUrlFilter({ category: 'football', gender: 'men' });
          await expect(list.heading).toHaveText(
            `${catalogTitle({ gender: 'men' }, 'Football')} (2)`
          );
        });

        await test.step('Sort By → Price: Low-High', async () => {
          await list.sortBy('Price: Low-High');
          await list.expectUrlFilter({ category: 'football', gender: 'men', sort: 'price-asc' });
          await expect(list.cards.getByTestId('product-name')).toHaveText([
            flow.name,
            'Nike Mercurial Vapor 17 Elite',
          ]);
        });

        await test.step('thẻ đầu → chọn size → Add to Bag → View Bag', async () => {
          await list.card(0).name.click();
          await expect.poll(() => pathOf(page)).toBe(`/t/${flow.slug}`);
          await pdp.addSize(flow.sizeLabel);
          await pdp.addedToBag.viewBagWith(1).click();
          await expect.poll(() => pathOf(page)).toBe('/cart');
          await cart.expectSummary(one);
        });

        await test.step('tăng lên 2 đôi → vượt ngưỡng miễn phí giao hàng', async () => {
          await cart.item(0).increase.click();
          await expect(cart.item(0).quantity).toHaveText('2');
          await cart.expectSummary(two);
          expect(two.fee).toBe(0);
        });

        await test.step('Checkout thẳng tới /checkout (không qua /signin)', async () => {
          await cart.checkout.click();
          await expect.poll(() => pathOf(page)).toBe('/checkout');
          await expect(checkout.shipping).toHaveText('Free');
          await checkout.fillDelivery(DELIVERY);
          await checkout.placeOrder.click();
        });

        const code = await waitForResult(page);
        await expect(result.payNote).toHaveText(
          `Pay ${two.total} in cash when your order arrives.`
        );

        await test.step('API: 2 đôi, miễn phí giao hàng, tồn kho giảm 2', async () => {
          const khach2 = await apiAs('khach2');
          const order = await khach2.client.expectOk(await khach2.order.get(code));
          expect(order.items).toHaveLength(1);
          expect(order.items[0]).toMatchObject({ sizeId: flow.sizeId, quantity: 2 });
          expect(order).toMatchObject({ shippingFee: 0, total: flow.price * 2 });
          expect(await stockNow(api, flow.sizeId)).toBe(FLOW_STOCK - 2);
        });

        expect(errors).toEqual([]);
      }
    );
  });

  test(
    'TC-03 F3 khách mới tạo tài khoản lúc thanh toán',
    { tag: '@regression' },
    async (
      {
        page,
        productDetailPage: pdp,
        signInPage,
        checkoutPage: checkout,
        orderResultPage: result,
        api,
        apiAs,
      },
      testInfo
    ) => {
      const flow = flowOf('F3', testInfo);
      const email = uniqueEmail();
      const errors = collectPageErrors(page);
      await (await apiAs('admin')).testSupport.setStockOk(flow.sizeId, FLOW_STOCK);

      await test.step('chi tiết → Add to Bag → Checkout trong popup → /signin', async () => {
        await pdp.goto(flow.slug);
        await pdp.addSize(flow.sizeLabel);
        await pdp.addedToBag.checkout.click();
        await expectSignInForCheckout(page);
      });

      await test.step('email mới → tạo tài khoản → về /checkout', async () => {
        await signInPage.join({ name: NEW_CUSTOMER_NAME, email, password: PASSWORD });
        await expect.poll(() => pathOf(page)).toBe('/checkout');
        await expect(checkout.items).toHaveCount(1);
        await expect(checkout.item(0).size).toHaveText(`Size ${flow.sizeLabel}`);
        await expect(checkout.fullName).toHaveValue(NEW_CUSTOMER_NAME);
      });

      await test.step('điền giao hàng → Place Order', async () => {
        await checkout.fillDelivery({
          phone: DELIVERY.phone,
          address: DELIVERY.address,
          note: DELIVERY.note,
        });
        await checkout.placeOrder.click();
      });

      const code = await waitForResult(page);
      await expect(result.heading).toHaveText('Thank you for your order');

      await test.step('API: đơn thuộc tài khoản vừa tạo, tồn kho giảm 1', async () => {
        const login = await api.auth.loginOk({ email, password: PASSWORD });
        api.useToken(login.token);
        const order = await api.client.expectOk(await api.order.get(code));
        expect(order.receiverName).toBe(NEW_CUSTOMER_NAME);
        expect(order.items).toHaveLength(1);
        expect(order.items[0]).toMatchObject({ sizeId: flow.sizeId, quantity: 1 });
        expect(await stockNow(api, flow.sizeId)).toBe(FLOW_STOCK - 1);
      });

      expect(errors).toEqual([]);
    }
  );

  test.describe('khách đã đăng nhập (khach1)', () => {
    test.use({ storageState: storageStateOf('khach1') });

    test(
      'TC-04 F4 mất mạng khi đặt hàng, có mạng lại thì đặt được đúng một đơn',
      { tag: ['@regression', '@mock'] },
      async ({ page, context, checkoutPage: checkout, api, apiAs }, testInfo) => {
        test.skip(testInfo.project.name === MOBILE, 'luồng desktop');
        const flow = flowOf('F4', testInfo);
        const item = { sizeId: flow.sizeId, quantity: 1 };
        await (await apiAs('admin')).testSupport.setStockOk(flow.sizeId, FLOW_STOCK);

        await test.step('giỏ 1 đôi → /checkout → điền giao hàng', async () => {
          await setCart(page, [item]);
          await checkout.goto();
          await expect(checkout.items).toHaveCount(1);
          await checkout.fillDelivery(DELIVERY);
        });

        await test.step('mất mạng → Place Order → báo lỗi, giữ nguyên giỏ', async () => {
          await context.setOffline(true);
          await checkout.placeOrder.click();
          await expect(checkout.error).toHaveText(NETWORK_ERROR);
          expect(pathOf(page)).toBe('/checkout');
          expect(await readCart(page)).toEqual([item]);
          await expect(checkout.placeOrder).toBeEnabled();
        });

        await test.step('có mạng lại → Place Order → trang xác nhận', async () => {
          await context.setOffline(false);
          await checkout.placeOrder.click();
          await waitForResult(page);
        });

        await test.step('API: đúng một đơn được tạo (tồn kho giảm 1)', async () => {
          expect(await stockNow(api, flow.sizeId)).toBe(FLOW_STOCK - 1);
        });
      }
    );
  });

  test.describe('hết phiên giữa lúc đặt hàng', () => {
    test.beforeEach(({}, testInfo) => {
      test.skip(testInfo.project.name === MOBILE, 'luồng desktop');
    });

    /**
     * Tạo tài khoản mới qua API (refresh token dùng một lần — plan §11 câu 3), đăng nhập trên `/signin`,
     * giỏ 1 đôi, mở `/checkout` và điền giao hàng.
     * @param {{ page: Page, api: Api, signInPage: import('../../pages/SignInPage.js').SignInPage,
     *   checkout: import('../../pages/CheckoutPage.js').CheckoutPage, sizeId: number }} args
     */
    async function signedInCheckout({ page, api, signInPage, checkout, sizeId }) {
      const email = uniqueEmail();
      const account = { email, password: PASSWORD };
      await api.client.expectOk(
        await api.account.register({ name: NEW_CUSTOMER_NAME, email, plainPassword: PASSWORD })
      );
      await setCart(page, [{ sizeId, quantity: 1 }]);
      await signInPage.goto({ redirect: '/checkout' });
      await signInPage.signIn(account);
      await expect.poll(() => pathOf(page)).toBe('/checkout');
      await expect(checkout.items).toHaveCount(1);
      await checkout.fillDelivery(DELIVERY);
      return account;
    }

    test(
      'TC-05a F5a create trả 401 một lần → refresh → gửi lại thành công',
      { tag: ['@regression', '@mock'] },
      async ({ page, signInPage, checkoutPage: checkout, api, apiAs }, testInfo) => {
        const flow = flowOf('F5a', testInfo);
        await (await apiAs('admin')).testSupport.setStockOk(flow.sizeId, FLOW_STOCK);
        await signedInCheckout({ page, api, signInPage, checkout, sizeId: flow.sizeId });

        const creates = countRequests(page, CREATE_URL, { method: 'POST' });
        const refreshes = countRequests(page, REFRESH_URL, { method: 'POST' });
        const expire = failOnce(401, SESSION_EXPIRED);
        await page.route(CREATE_URL, expire);

        await checkout.placeOrder.click();
        await waitForResult(page);

        expect(expire.calls).toBe(2);
        expect(creates.count).toBe(2);
        expect(refreshes.count).toBe(1);
        expect(await stockNow(api, flow.sizeId)).toBe(FLOW_STOCK - 1);
      }
    );

    test(
      'TC-05b F5b refresh cũng 401 → về /signin, giỏ nguyên, đăng nhập lại đặt được',
      { tag: ['@regression', '@mock'] },
      async ({ page, signInPage, checkoutPage: checkout, api, apiAs }, testInfo) => {
        const flow = flowOf('F5b', testInfo);
        const item = { sizeId: flow.sizeId, quantity: 1 };
        await (await apiAs('admin')).testSupport.setStockOk(flow.sizeId, FLOW_STOCK);
        const account = await signedInCheckout({
          page,
          api,
          signInPage,
          checkout,
          sizeId: flow.sizeId,
        });

        await test.step('create 401 + refresh 401 → phiên bị xoá, về /signin', async () => {
          await page.route(CREATE_URL, failOnce(401, SESSION_EXPIRED));
          await page.route(REFRESH_URL, (route) =>
            route.fulfill({ status: 401, json: SESSION_EXPIRED })
          );
          await checkout.placeOrder.click();
          await expectSignInForCheckout(page);
          // `/signin` nằm ngoài layout cửa hàng (không có header): kiểm phiên đã xoá bằng kho token
          expect(await pageAccessToken(page)).toBeNull();
          await expect(signInPage.emailInput).toBeVisible();
          expect(await readCart(page)).toEqual([item]);
          expect(await stockNow(api, flow.sizeId)).toBe(FLOW_STOCK);
        });

        await test.step('đăng nhập lại → /checkout → đặt được', async () => {
          await page.unrouteAll();
          await signInPage.signIn(account);
          await expect.poll(() => pathOf(page)).toBe('/checkout');
          await expect(checkout.items).toHaveCount(1);
          await checkout.fillDelivery(DELIVERY);
          await checkout.placeOrder.click();
          await waitForResult(page);
          expect(await stockNow(api, flow.sizeId)).toBe(FLOW_STOCK - 1);
        });
      }
    );
  });
});
