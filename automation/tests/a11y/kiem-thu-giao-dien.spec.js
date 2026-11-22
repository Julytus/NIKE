import { accounts, storageStateOf } from '../../data/accounts.js';
import { orderBody } from '../../data/orders.js';
import { publishedProducts, stockOf } from '../../data/seed-products.js';
import { expect, test } from '../../fixtures/index.js';
import { SizeGuideDialog } from '../../pages/components/SizeGuideDialog.js';
import { scanA11y } from '../../utils/a11y.js';
import { setCart } from '../../utils/cart-storage.js';
import { laneOf } from '../../utils/lane.js';
import { uniqueEmail } from '../../utils/unique.js';
import { settle } from '../../utils/visual.js';

/**
 * Lát `kiem-thu-giao-dien` (plan/kiem-thu-giao-dien.md §6.2, §9 TC-20 → TC-31, TC-40): quét axe WCAG 2.1 AA
 * ở `chromium` + `mobile-chrome` trên các trang / trạng thái tương tác. Mỗi test quét nhiều trạng thái bằng
 * `expect.soft` (vi phạm ở trạng thái đầu không chặn việc quét các trạng thái sau). Chạy: `pnpm test:a11y`,
 * bảng vi phạm: `pnpm report:a11y`. Danh sách chấp nhận: `data/a11y-known.json`.
 */

const MOBILE = 'mobile-chrome';
const DUNK = 'nike-dunk-low-retro';
const HIDDEN = 'nike-air-max-plus-premium';
/** Size Nike Air Max 95 cho đơn ở TC-27, một size mỗi làn — cùng làn với TC-10 visual (mỗi test một đơn mới). */
const ORDER_LANES = [505, 506, 507, 508];

/** sizeId đầu tiên còn ≥ 10 đôi của sản phẩm. */
const stableSizeId = (/** @type {import('../../data/seed-products.js').SeedProduct} */ p) =>
  p.id * 100 + stockOf(p).findIndex((s) => s.stock >= 10) + 1;
const regular = publishedProducts().find((p) => p.salePrice === null);
const onSale = publishedProducts().find((p) => p.salePrice !== null);
if (!regular || !onSale) throw new Error('products.json thiếu sản phẩm giá thường / giảm giá');
const CART_2_LINES = [
  { sizeId: stableSizeId(regular), quantity: 1 },
  { sizeId: stableSizeId(onSale), quantity: 1 },
];
/** Size đầu tiên còn hàng của Dunk (TC-22 `pdp-added`). */
const DUNK_SIZE = (() => {
  const dunk = publishedProducts().find((p) => p.slug === DUNK);
  const size = dunk && stockOf(dunk).find((s) => s.stock >= 10);
  if (!size) throw new Error(`products.json thiếu ${DUNK}`);
  return size.sizeLabel;
})();

/**
 * Xoá trắng Full Name / Phone Number / Address rồi bấm "Place Order": lỗi kiểm ở giao diện, không gọi API tạo đơn.
 * @param {import('../../pages/CheckoutPage.js').CheckoutPage} checkout
 */
async function submitEmptyDelivery(checkout) {
  for (const input of [checkout.fullName, checkout.phone, checkout.address]) await input.fill('');
  await checkout.placeOrder.click();
  await expect(checkout.fullName).toHaveAttribute('aria-invalid', 'true');
}

/** @param {import('@playwright/test').TestInfo} testInfo */
const isMobile = (testInfo) => testInfo.project.name === MOBILE;

/**
 * Mobile mở ngăn kéo "Filter", desktop mở menu "Sort By"; trả tên quét tương ứng.
 * @param {import('../../pages/ProductListPage.js').ProductListPage} list
 * @param {boolean} mobile
 */
async function openCatalogOverlay(list, mobile) {
  if (mobile) {
    await list.filterOpenButton.click();
    await expect(list.drawer.root).toBeVisible();
    return 'catalog-filter';
  }
  await list.sortTrigger.click();
  await expect(list.page.getByRole('menu')).toBeVisible();
  return 'catalog-sort';
}

test.describe('A11y cửa hàng @a11y', () => {
  test('TC-20 trang chủ', { tag: '@smoke' }, async ({ homePage, page }, testInfo) => {
    await homePage.goto('/');
    await expect(homePage.heroHeading).toBeVisible();
    await settle(page);
    await scanA11y(page, testInfo, 'home');
  });

  test(
    'TC-21 danh sách, Sort By / Filter',
    { tag: '@regression' },
    async ({ productListPage: list, page }, testInfo) => {
      await list.goto('/w');
      await expect(list.cards.first()).toBeVisible();
      await settle(page);
      await scanA11y(page, testInfo, 'catalog');
      const name = await openCatalogOverlay(list, isMobile(testInfo));
      await scanA11y(page, testInfo, name);
    }
  );

  test(
    'TC-22 chi tiết giày: lỗi size, Size Guide, Added to Bag, gallery bàn phím',
    { tag: '@regression' },
    async ({ productDetailPage: pdp, page }, testInfo) => {
      await pdp.goto(DUNK);
      await expect(pdp.heading).toHaveText('Nike Dunk Low Retro');
      await settle(page);
      await scanA11y(page, testInfo, 'pdp');

      await pdp.addToBag.click();
      await expect(pdp.sizeError).toHaveText('Please select a size.');
      await scanA11y(page, testInfo, 'pdp-size-error');

      const guide = new SizeGuideDialog(page);
      await pdp.sizeGuideButton.click();
      await expect(guide.title).toBeVisible();
      await scanA11y(page, testInfo, 'pdp-size-guide');
      await page.keyboard.press('Escape');
      await expect(guide.root).toBeHidden();

      await pdp.addSize(DUNK_SIZE);
      await expect(pdp.addedToBag.title).toBeVisible();
      await scanA11y(page, testInfo, 'pdp-added');
      await pdp.addedToBag.close.click();
      await expect(pdp.addedToBag.root).toBeHidden();

      // TC-40: dải ảnh focus được bằng bàn phím, ArrowRight cuộn ngang
      const gallery = page.getByRole('region', { name: 'Product images', exact: true });
      await gallery.focus();
      await expect(gallery).toBeFocused();
      const before = await gallery.evaluate((el) => el.scrollLeft);
      await page.keyboard.press('ArrowRight');
      await expect.poll(() => gallery.evaluate((el) => el.scrollLeft)).toBeGreaterThan(before);
    }
  );

  test(
    'TC-23 khung tìm kiếm / menu mobile',
    { tag: '@regression' },
    async ({ homePage, page }, testInfo) => {
      await homePage.goto('/');
      await expect(homePage.heroHeading).toBeVisible();
      await settle(page);
      if (isMobile(testInfo)) {
        await homePage.header.openMobileMenu();
        await scanA11y(page, testInfo, 'mobile-menu');
      } else {
        await homePage.header.openSearch();
        await scanA11y(page, testInfo, 'search');
      }
    }
  );

  test(
    'TC-24 giỏ hàng 2 dòng + giỏ rỗng',
    { tag: '@regression' },
    async ({ cartPage: cart, page }, testInfo) => {
      await setCart(page, CART_2_LINES);
      await cart.goto('/cart');
      await expect(cart.items).toHaveCount(2);
      await settle(page);
      await scanA11y(page, testInfo, 'cart');
      await setCart(page, []);
      await page.reload({ waitUntil: 'load' });
      await expect(cart.empty).toBeVisible();
      await scanA11y(page, testInfo, 'cart-empty');
    }
  );

  test(
    'TC-25 đăng nhập khách: email, mật khẩu, tạo tài khoản',
    { tag: '@regression' },
    async ({ signInPage: signIn, page }, testInfo) => {
      await signIn.goto();
      await signIn.expectStep('email');
      await scanA11y(page, testInfo, 'signin-email');
      await signIn.submitEmail(accounts.customer.email);
      await signIn.expectStep('password');
      await scanA11y(page, testInfo, 'signin-password');
      await signIn.editButton.click();
      await signIn.expectStep('email');
      await signIn.submitEmail(uniqueEmail());
      await signIn.expectStep('join');
      await scanA11y(page, testInfo, 'signin-join');
    }
  );

  test(
    'TC-28 trang 404 + sản phẩm ẩn',
    { tag: '@regression' },
    async ({ notFoundPage, productDetailPage: pdp, page }, testInfo) => {
      await page.goto('/khong-co-trang-nay', { waitUntil: 'load' });
      await expect(notFoundPage.message).toBeVisible();
      await scanA11y(page, testInfo, 'not-found');
      await pdp.goto(HIDDEN);
      await expect(pdp.heading).toHaveText('Product Not Found');
      await scanA11y(page, testInfo, 'pdp-not-found');
    }
  );

  test(
    'TC-31 chứng minh axe bắt được nút không có tên',
    { tag: '@regression' },
    async ({ homePage, page }, testInfo) => {
      await homePage.goto('/');
      await expect(homePage.heroHeading).toBeVisible();
      await page
        .locator('main')
        .evaluate((main) =>
          main.insertAdjacentHTML('afterbegin', '<button id="zz-a11y"><svg></svg></button>')
        );
      const error = await scanA11y(page, testInfo, 'home-injected', {
        soft: false,
        demo: true,
      }).then(
        () => null,
        (e) => /** @type {Error} */ (e)
      );
      expect(error?.message).toContain('Vi phạm WCAG 2.1 AA ở home-injected');
      expect(error?.message).toContain('[critical] button-name × 1 — #zz-a11y');
    }
  );
});

test.describe('A11y khách đã đăng nhập @a11y', () => {
  test.use({ storageState: storageStateOf('khach1') });

  test(
    'TC-26 thanh toán + lỗi form',
    { tag: '@regression' },
    async ({ checkoutPage: checkout, page }, testInfo) => {
      await setCart(page, CART_2_LINES.slice(0, 1));
      await checkout.goto('/checkout');
      await expect(checkout.items).toHaveCount(1);
      await settle(page);
      await scanA11y(page, testInfo, 'checkout');
      await submitEmptyDelivery(checkout);
      await scanA11y(page, testInfo, 'checkout-errors');
    }
  );
});

test.describe('A11y trang xác nhận đơn @a11y @stock', () => {
  test.use({ storageState: storageStateOf('khach1') });

  test(
    'TC-27 trang xác nhận đơn',
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
      await settle(page);
      await scanA11y(page, testInfo, 'order-result');
    }
  );
});

test.describe('A11y quản trị @a11y', () => {
  test(
    'TC-29 đăng nhập quản trị + lỗi form trống',
    { tag: '@regression' },
    async ({ loginPage, page }, testInfo) => {
      await loginPage.goto('/login');
      await expect(loginPage.submitButton).toBeVisible();
      await scanA11y(page, testInfo, 'admin-login');
      await loginPage.submitButton.click();
      await expect(page.locator('[aria-invalid="true"]').first()).toBeVisible();
      await scanA11y(page, testInfo, 'admin-login-errors');
    }
  );

  test.describe('admin', () => {
    test.use({ storageState: storageStateOf('admin') });

    test(
      'TC-30 các trang quản trị + hộp thoại thêm chức vụ',
      { tag: '@regression' },
      async ({ adminLayout, rolePage, page }, testInfo) => {
        await page.goto('/admin', { waitUntil: 'load' });
        await expect(adminLayout.greeting).toHaveText('Hi, Administrator');
        await settle(page);
        await scanA11y(page, testInfo, 'admin-dashboard');

        await rolePage.open();
        await settle(page);
        await scanA11y(page, testInfo, 'admin-roles');
        const dialog = await rolePage.openCreate();
        await expect(dialog.root).toBeVisible();
        await scanA11y(page, testInfo, 'admin-role-dialog');
        await dialog.cancelButton.click();
        await expect(dialog.root).toBeHidden();

        for (const [path, heading, name] of [
          ['/admin/permissions', 'Permissions', 'admin-permissions'],
          ['/admin/resources', 'Resources', 'admin-resources'],
          ['/admin/modules', 'Modules', 'admin-modules'],
        ]) {
          await page.goto(path, { waitUntil: 'load' });
          await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
          await settle(page);
          await scanA11y(page, testInfo, name);
        }
      }
    );
  });
});
