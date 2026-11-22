import fs from 'node:fs';
import path from 'node:path';

import { accounts, storageStateOf } from '../../data/accounts.js';
import { orderBody } from '../../data/orders.js';
import { publishedProducts, stockOf } from '../../data/seed-products.js';
import { expect, test } from '../../fixtures/index.js';
import { setCart } from '../../utils/cart-storage.js';
import { laneOf } from '../../utils/lane.js';
import { masks, requireVisualServer, settle, visualConnect } from '../../utils/visual.js';

/**
 * Lát `kiem-thu-giao-dien` (plan/kiem-thu-giao-dien.md §6.1, §9 TC-01 → TC-15): visual regression bằng
 * `toHaveScreenshot` ở `chromium` + `mobile-chrome`. Trình duyệt chạy trong Playwright server Docker (Linux) nên
 * một bộ ảnh chuẩn dùng chung cho máy Windows và CI: `tests/visual/__screenshots__/<project>/<tên>.png`.
 * Không đặt `E2E_PW_WS` thì mọi test bỏ qua (E1). Chạy: `pnpm test:visual`, cập nhật ảnh: `pnpm test:visual:update`.
 */

test.use({ connectOptions: visualConnect() });

test.beforeEach(() => requireVisualServer());

const MOBILE = 'mobile-chrome';
/** Message của Playwright 1.63 khi ảnh khác ảnh chuẩn (plan §12: không phải "Screenshot comparison failed"). */
const DIFF_MESSAGE = /pixels \(ratio [\d.]+ of all image pixels\) are different/;
const DUNK = 'nike-dunk-low-retro';
const DUNK_NAME = 'Nike Dunk Low Retro';
const HIDDEN = 'nike-air-max-plus-premium';
/** Size Nike Air Max 95 cho đơn ở TC-10, một size mỗi làn (`laneOf`), không spec @stock nào khác dùng. */
const ORDER_LANES = [505, 506, 507, 508];

/** sizeId đầu tiên còn ≥ 10 đôi của sản phẩm (tồn kho ổn định, không hiện "Just a few left"). */
const stableSizeId = (/** @type {import('../../data/seed-products.js').SeedProduct} */ p) => {
  const index = stockOf(p).findIndex((s) => s.stock >= 10);
  return p.id * 100 + index + 1;
};
const regular = publishedProducts().find((p) => p.salePrice === null);
const onSale = publishedProducts().find((p) => p.salePrice !== null);
if (!regular || !onSale) throw new Error('products.json thiếu sản phẩm giá thường / giảm giá');
const CART_2_LINES = [
  { sizeId: stableSizeId(regular), quantity: 1 },
  { sizeId: stableSizeId(onSale), quantity: 1 },
];

/**
 * Xoá trắng Full Name / Phone Number / Address rồi bấm "Place Order": lỗi kiểm ở giao diện, không gọi API tạo đơn.
 * @param {import('../../pages/CheckoutPage.js').CheckoutPage} checkout
 */
async function submitEmptyDelivery(checkout) {
  for (const input of [checkout.fullName, checkout.phone, checkout.address]) await input.fill('');
  await checkout.placeOrder.click();
  await expect(checkout.fullName).toHaveAttribute('aria-invalid', 'true');
}

/**
 * Chụp khung nhìn sau `settle`, che `masks`.
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function shot(page, name) {
  await settle(page);
  await expect(page).toHaveScreenshot(name, { mask: masks(page) });
}

/**
 * Thẻ đầu tiên có giá gạch ở `/w`. Trang đầu (12 thẻ) có thể chưa có sản phẩm giảm giá → cuộn tới thẻ cuối để
 * tải thêm (cuộn vô hạn) cho tới khi có.
 * @param {import('../../pages/ProductListPage.js').ProductListPage} list
 */
async function firstSaleCard(list) {
  const sale = list.cards.filter({ has: list.page.locator('s') });
  for (let i = 0; i < 5 && (await sale.count()) === 0; i++) {
    const before = await list.cards.count();
    await list.cards.last().scrollIntoViewIfNeeded();
    await expect.poll(() => list.cards.count()).toBeGreaterThan(before);
  }
  return sale.first();
}

/**
 * Mobile: mở ngăn kéo "Filter" rồi chụp khung nhìn.
 * @param {import('../../pages/ProductListPage.js').ProductListPage} list
 */
async function shotFilterDrawer(list) {
  await list.filterOpenButton.click();
  await expect(list.drawer.root).toBeVisible();
  await settle(list.page, { scrollTop: false });
  await expect(list.page).toHaveScreenshot('catalog-filter.png');
}

test.describe('Visual cửa hàng @visual', () => {
  test('TC-01 trang chủ', { tag: '@smoke' }, async ({ homePage }) => {
    await homePage.goto('/');
    await expect(homePage.heroHeading).toBeVisible();
    await shot(homePage.page, 'home.png');
  });

  test('TC-02 header, footer', { tag: '@regression' }, async ({ homePage, page }) => {
    await homePage.goto('/');
    await settle(page);
    await expect(homePage.header.root).toHaveScreenshot('header.png');
    await homePage.footer.root.scrollIntoViewIfNeeded();
    await settle(page, { scrollTop: false });
    await expect(homePage.footer.root).toHaveScreenshot('footer.png');
  });

  test(
    'TC-03 danh sách /w',
    { tag: '@regression' },
    async ({ productListPage: list, page }, testInfo) => {
      await list.goto('/w');
      await expect(list.cards.first()).toBeVisible();
      await shot(page, 'catalog.png');
      if (testInfo.project.name === MOBILE) await shotFilterDrawer(list);
    }
  );

  test('TC-04 thẻ sản phẩm', { tag: '@regression' }, async ({ productListPage: list, page }) => {
    await list.goto('/w');
    await expect(list.cards.first()).toBeVisible();
    await settle(page);
    await expect(list.cards.first()).toHaveScreenshot('product-card.png');
    const sale = await firstSaleCard(list);
    await sale.scrollIntoViewIfNeeded();
    await settle(page, { scrollTop: false });
    await expect(sale).toHaveScreenshot('product-card-sale.png');
  });

  test(
    'TC-05 chi tiết giày + lỗi chưa chọn size',
    { tag: '@regression' },
    async ({ productDetailPage: pdp, page }) => {
      await pdp.goto(DUNK);
      await expect(pdp.heading).toHaveText(DUNK_NAME);
      await shot(page, 'pdp.png');
      await pdp.addToBag.click();
      await expect(pdp.sizeError).toHaveText('Please select a size.');
      await settle(page, { scrollTop: false });
      // vùng chọn size = khối cha của lưới size (nhãn "Select Size", lưới, dòng lỗi)
      await expect(pdp.sizeGrid.locator('..')).toHaveScreenshot('pdp-size-error.png');
    }
  );

  test('TC-06 sản phẩm ẩn', { tag: '@regression' }, async ({ productDetailPage: pdp, page }) => {
    await pdp.goto(HIDDEN);
    await expect(pdp.heading).toHaveText('Product Not Found');
    await shot(page, 'pdp-not-found.png');
  });

  test(
    'TC-07 giỏ hàng 2 dòng + giỏ rỗng',
    { tag: '@regression' },
    async ({ cartPage: cart, page }) => {
      await setCart(page, CART_2_LINES);
      await cart.goto('/cart');
      await expect(cart.items).toHaveCount(2);
      await shot(page, 'cart.png');
      await setCart(page, []);
      await page.reload({ waitUntil: 'load' });
      await expect(cart.empty).toBeVisible();
      await shot(page, 'cart-empty.png');
    }
  );

  test(
    'TC-08 đăng nhập khách: email → mật khẩu',
    { tag: '@regression' },
    async ({ signInPage: signIn, page }) => {
      await signIn.goto();
      await signIn.expectStep('email');
      await shot(page, 'signin-email.png');
      await signIn.submitEmail(accounts.customer.email);
      await signIn.expectStep('password');
      await shot(page, 'signin-password.png');
    }
  );

  test('TC-11 trang 404', { tag: '@regression' }, async ({ notFoundPage, page }) => {
    await page.goto('/khong-co-trang-nay', { waitUntil: 'load' });
    await expect(notFoundPage.message).toBeVisible();
    await shot(page, 'not-found.png');
  });

  test(
    'TC-15 chứng minh bắt được thay đổi giao diện',
    { tag: '@regression' },
    async ({ productDetailPage: pdp, page }, testInfo) => {
      test.skip(testInfo.config.updateSnapshots === 'all', 'Không chạy khi cập nhật ảnh chuẩn');
      test.skip(!fs.existsSync(testInfo.snapshotPath('pdp.png')), 'Chưa có ảnh chuẩn pdp.png');
      await pdp.goto(DUNK);
      await expect(pdp.heading).toHaveText(DUNK_NAME);
      await page.addStyleTag({
        content:
          '[data-testid="pdp-add-to-bag"] { background: #d33918 !important; }' +
          '[data-testid="pdp-price-block"] { transform: translateY(6px) !important; }',
      });
      await settle(page);
      await expect(
        expect(page).toHaveScreenshot('pdp.png', { mask: masks(page), timeout: 3000 })
      ).rejects.toThrow(DIFF_MESSAGE);
      for (const kind of ['expected', 'actual', 'diff']) {
        expect(fs.existsSync(testInfo.outputPath(`pdp-${kind}.png`)), `pdp-${kind}.png`).toBe(true);
      }
      copyDiffForDocs(testInfo);
    }
  );
});

test.describe('Visual khách đã đăng nhập @visual', () => {
  test.use({ storageState: storageStateOf('khach1') });

  test(
    'TC-09 thanh toán + lỗi form',
    { tag: '@regression' },
    async ({ checkoutPage: checkout, page }) => {
      await setCart(page, CART_2_LINES.slice(0, 1));
      await checkout.goto('/checkout');
      await expect(checkout.items).toHaveCount(1);
      await shot(page, 'checkout.png');
      await submitEmptyDelivery(checkout);
      await shot(page, 'checkout-errors.png');
    }
  );
});

test.describe('Visual trang xác nhận đơn @visual @stock', () => {
  test.use({ storageState: storageStateOf('khach1') });

  test(
    'TC-10 trang xác nhận đơn',
    { tag: '@regression' },
    async ({ apiAs, orderResultPage: result, page }, testInfo) => {
      const khach1 = await apiAs('khach1');
      const { code } = await khach1.client.expectOk(
        await khach1.order.create(
          orderBody([{ sizeId: ORDER_LANES[laneOf(testInfo)], quantity: 1 }])
        )
      );
      await result.goto(code);
      await expect(result.code).toHaveText(code);
      await shot(page, 'order-result.png');
    }
  );
});

test.describe('Visual quản trị @visual', () => {
  test('TC-12 đăng nhập quản trị', { tag: '@regression' }, async ({ loginPage, page }) => {
    await loginPage.goto('/login');
    await expect(loginPage.submitButton).toBeVisible();
    await shot(page, 'admin-login.png');
  });

  test.describe('admin', () => {
    test.use({ storageState: storageStateOf('admin') });

    test('TC-13 bảng điều khiển', { tag: '@regression' }, async ({ adminLayout, page }) => {
      await page.goto('/admin', { waitUntil: 'load' });
      await expect(adminLayout.greeting).toHaveText('Hi, Administrator');
      await shot(page, 'admin-dashboard.png');
    });

    test('TC-14 chức vụ + hộp thoại thêm', { tag: '@regression' }, async ({ rolePage, page }) => {
      await rolePage.open();
      await shot(page, 'admin-roles.png');
      const dialog = await rolePage.openCreate();
      await expect(dialog.root).toBeVisible();
      await settle(page, { scrollTop: false });
      await expect(dialog.root).toHaveScreenshot('admin-role-dialog.png');
    });
  });
});

/**
 * Có `E2E_DOC_SHOTS`: chép bộ ba expected / actual / diff của TC-15 (chỉ desktop) vào thư mục ảnh tài liệu.
 * @param {import('@playwright/test').TestInfo} testInfo
 */
function copyDiffForDocs(testInfo) {
  const dir = process.env.E2E_DOC_SHOTS;
  if (!dir || testInfo.project.name !== 'chromium') return;
  fs.mkdirSync(path.resolve(dir), { recursive: true });
  for (const kind of ['expected', 'actual', 'diff']) {
    fs.copyFileSync(
      testInfo.outputPath(`pdp-${kind}.png`),
      path.resolve(dir, `visual-pdp-${kind}.png`)
    );
  }
}
