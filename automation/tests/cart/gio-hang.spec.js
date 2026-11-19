/* global document, window -- dùng trong page.evaluate (chạy ở trình duyệt) */
import cartShipping from '../../data/cart-shipping.json' with { type: 'json' };
import cartDirty from '../../data/cart-storage-dirty.json' with { type: 'json' };
import { accounts } from '../../data/accounts.js';
import { expectedRelated, sizeIdOf, sizesOf, seedBySlug } from '../../data/seed-products.js';
import { expect, test } from '../../fixtures/index.js';
import { CartPage } from '../../pages/CartPage.js';
import { HeaderComponent } from '../../pages/components/HeaderComponent.js';
import { readCart, setCart } from '../../utils/cart-storage.js';
import { docShot } from '../../utils/doc-shot.js';
import { formatVnd } from '../../utils/format.js';
import { findVietnamese } from '../../utils/vietnamese.js';

/**
 * Lát `gio-hang` (plan/gio-hang.md §6, §9 TC-10 → TC-26): "Add to Bag" thật + popup "Added to Bag",
 * số trên icon túi, trang `/cart` (số lượng, xoá, đổi size, dòng hết hàng / ngừng bán / tự giảm, Summary,
 * phí giao hàng, "Checkout"), giỏ localStorage `nike.cart` (làm sạch, đồng bộ tab), lỗi / skeleton, mobile.
 * Giỏ chuẩn bị bằng `setCart`; size id tính bằng `sizeIdOf` từ `products.json`.
 * TC-27 (hồi quy) = chạy lại chi-tiet-giay, giao-dien-nike, tieng-anh-cua-hang + `pnpm test:smoke`.
 */

const MOBILE = 'mobile-chrome';
const DESKTOP_1440 = { width: 1440, height: 900 };
const DUNK = 'nike-dunk-low-retro';
const DUNK_NAME = 'Nike Dunk Low Retro';
const CHECK_URL = /\/api\/cart\/public\/check$/;
const MAX_REACHED = "You've reached the maximum quantity for this size.";
const EMPTY_TEXT = 'There are no items in your bag.';
const QUALIFY_TEXT = 'You qualify for free delivery.';
const SOLD_OUT_TEXT = 'This size is sold out. Choose another size or remove it.';
const UNAVAILABLE_TEXT = 'This product is no longer available.';
const LOW_STOCK_TEXT = 'Just a few left. Order soon.';
const DASH = '—';
const AUTO_CLOSE_MAX_MS = 7_000;

const S = {
  dunk42: sizeIdOf(DUNK, 'EU 42'),
  dunk43: sizeIdOf(DUNK, 'EU 43'),
  dunk385: sizeIdOf(DUNK, 'EU 38.5'),
  revolution42: sizeIdOf('nike-revolution-8', 'EU 42'),
  vaporfly38: sizeIdOf('nike-vaporfly-4', 'EU 38'),
  ja43: sizeIdOf('ja-4-blur-ep', 'EU 43'),
  precision42: sizeIdOf('nike-precision-8-low', 'EU 42'),
  spizike42: sizeIdOf('jordan-spizike-low-jam-central', 'EU 42'),
  hidden42: sizeIdOf('nike-air-max-plus-premium', 'EU 42'),
  missing: 999999,
};

/** @typedef {import('@playwright/test').Page} Page */
/** @typedef {import('../../pages/CartPage.js').CartPage} CartPageType */

/** Ghi lỗi JS của trang. @param {Page} page */
function collectPageErrors(page) {
  /** @type {string[]} */
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

/**
 * Đếm request `POST …/cart/public/check` và response 400 của nó.
 * @param {Page} page
 */
function watchCheck(page) {
  const state = { requests: 0, badResponses: 0 };
  page.on('request', (req) => {
    if (req.method() === 'POST' && CHECK_URL.test(new URL(req.url()).pathname)) state.requests += 1;
  });
  page.on('response', (res) => {
    if (CHECK_URL.test(new URL(res.url()).pathname) && res.status() === 400)
      state.badResponses += 1;
  });
  return state;
}

/** Trả 500 cho `check`. @param {import('@playwright/test').Route} route */
const fail500 = (route) =>
  route.fulfill({ status: 500, json: { code: 500, message: 'Simulated error' } });

/** @param {number} ms */
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/** Giỏ trong localStorage phải bằng `expected` (chờ vì ghi sau khi render). @param {Page} page @param {unknown} expected */
async function expectStoredCart(page, expected) {
  await expect.poll(() => readCart(page), { message: 'nike.cart' }).toEqual(expected);
}

/**
 * Số trên túi + tên link túi (plan §6.1). `count = 0` → không có số, tên "Bag".
 * @param {Page} page
 * @param {number} count
 */
async function expectBagCount(page, count) {
  const header = new HeaderComponent(page);
  if (count === 0) {
    await expect(header.cartCount).toHaveCount(0);
    await expect(header.root.getByRole('link', { name: 'Bag', exact: true })).toBeVisible();
    return;
  }
  await expect(header.cartCount).toHaveText(String(count));
  await expect(header.cartCount).toHaveAttribute('aria-hidden', 'true');
  const name = `Bag, ${count} ${count === 1 ? 'item' : 'items'}`;
  await expect(header.root.getByRole('link', { name, exact: true })).toBeVisible();
}

/**
 * Summary (plan §6.6): ba giá trị + gợi ý (null = không có gợi ý).
 * @param {CartPageType} cart
 * @param {{ subtotal: string, shipping: string, total: string, hint: string | null }} expected
 */
async function expectSummary(cart, { subtotal, shipping, total, hint }) {
  await expect(cart.subtotal).toHaveText(subtotal);
  await expect(cart.shipping).toHaveText(shipping);
  await expect(cart.total).toHaveText(total);
  if (hint === null) await expect(cart.deliveryHint).toHaveCount(0);
  else await expect(cart.deliveryHint).toHaveText(hint);
}

/** Summary trống: "—" × 3, không gợi ý, Checkout khoá. @param {CartPageType} cart */
async function expectEmptySummary(cart) {
  await expectSummary(cart, { subtotal: DASH, shipping: DASH, total: DASH, hint: null });
  await expect(cart.checkout).toBeDisabled();
}

/** Gợi ý miễn phí giao hàng khi chưa đủ ngưỡng. @param {number} missing */
const addMoreText = (missing) => `Add ${formatVnd(missing)} more to get free delivery.`;

test.describe('Giỏ hàng — giao diện (desktop)', () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name === MOBILE, 'Nhóm desktop (mobile: TC-25)');
  });

  test(
    'TC-10 thêm vào giỏ từ trang chi tiết',
    { tag: '@smoke' },
    async ({ page, productDetailPage: pdp }, testInfo) => {
      const errors = collectPageErrors(page);
      await pdp.goto(DUNK);
      await expect(pdp.heading).toHaveText(DUNK_NAME);
      const dialog = pdp.addedToBag;

      await test.step('thêm EU 42 lần 1', async () => {
        await pdp.addSize('EU 42');
        await expect(page.getByRole('dialog', { name: 'Added to Bag' })).toBeVisible();
        await expect(dialog.root).toHaveAttribute('role', 'dialog');
        await expect(dialog.name).toHaveText(DUNK_NAME);
        await expect(dialog.subtitle).toHaveText("Men's Shoes");
        await expect(dialog.size).toHaveText('Size EU 42');
        await expect(dialog.price).toHaveText('3.519.000 ₫');
        await expect(dialog.image).toHaveAttribute('src', /\/1\.webp$/);
        await expect(dialog.image).toHaveAttribute('alt', DUNK_NAME);
        await expect(dialog.viewBagWith(1)).toBeVisible();
        await expect(dialog.checkout).toBeVisible();
        // Popup là dialog modal (plan §11 câu 6): nền (cả header) bị aria-hidden nên không đọc được số trên túi
        // qua landmark "banner" lúc popup mở — số trên túi kiểm ngay sau khi đóng popup (§12, phiên B)
        await expectStoredCart(page, [{ sizeId: S.dunk42, quantity: 1 }]);
        await docShot(page, testInfo, '01-popup-added-to-bag');
      });

      await test.step('Esc đóng popup', async () => {
        await page.keyboard.press('Escape');
        await expect(dialog.root).toHaveCount(0);
        await expectBagCount(page, 1);
      });

      await test.step('thêm EU 42 lần 2', async () => {
        await pdp.addToBag.click();
        await expect(dialog.viewBagWith(2)).toBeVisible();
        await expectStoredCart(page, [{ sizeId: S.dunk42, quantity: 2 }]);
        await page.keyboard.press('Escape');
        await expectBagCount(page, 2);
      });

      expect(errors).toEqual([]);
    }
  );

  test('TC-11 đóng popup', { tag: '@regression' }, async ({ page, productDetailPage: pdp }) => {
    test.setTimeout(90_000);
    const dialog = pdp.addedToBag;
    await pdp.goto(DUNK);
    await pdp.sizeByLabel('EU 42').click();

    const open = async () => {
      await pdp.addToBag.click();
      await expect(dialog.root).toBeVisible();
      return Date.now();
    };

    await test.step('(a) bấm Close', async () => {
      await open();
      await dialog.close.click();
      await expect(dialog.root).toHaveCount(0);
    });

    await test.step('(b) bấm nền ngoài popup', async () => {
      await open();
      const vp = /** @type {{ width: number, height: number }} */ (page.viewportSize());
      await page.mouse.click(20, vp.height - 20);
      await expect(dialog.root).toHaveCount(0);
    });

    await test.step('(c) tự đóng sau 5 giây', async () => {
      const vp = /** @type {{ width: number, height: number }} */ (page.viewportSize());
      await page.mouse.move(20, vp.height - 20);
      const openedAt = await open();
      await delay(1_000);
      await expect(dialog.root).toBeVisible();
      await expect(dialog.root).toHaveCount(0, {
        timeout: AUTO_CLOSE_MAX_MS - (Date.now() - openedAt),
      });
    });

    await test.step('(d) rê chuột lên popup thì không tự đóng', async () => {
      await open();
      await dialog.root.hover();
      await delay(AUTO_CLOSE_MAX_MS);
      await expect(dialog.root).toBeVisible();
      const vp = /** @type {{ width: number, height: number }} */ (page.viewportSize());
      await page.mouse.move(20, vp.height - 20);
      await expect(dialog.root).toHaveCount(0, { timeout: AUTO_CLOSE_MAX_MS });
    });

    await test.step('(e) bấm View Bag', async () => {
      await open();
      await dialog.viewBag.click();
      await expect(page).toHaveURL(/\/cart$/);
      await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText('Bag');
      await expect(dialog.root).toHaveCount(0);
    });
  });

  test(
    'TC-12 giới hạn khi thêm',
    { tag: '@regression' },
    async ({ page, productDetailPage: pdp }) => {
      const dialog = pdp.addedToBag;

      await test.step('ja-4-blur-ep EU 43 (tồn 1): lần 1 thêm được', async () => {
        await pdp.goto('ja-4-blur-ep');
        await pdp.addSize('EU 43');
        await expect(dialog.viewBagWith(1)).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(dialog.root).toHaveCount(0);
      });

      await test.step('lần 2: báo đã đủ số lượng', async () => {
        await pdp.addToBag.click();
        await expect(pdp.addError).toHaveText(MAX_REACHED);
        await expect(pdp.addError).toHaveAttribute('role', 'alert');
        await expect(dialog.root).toHaveCount(0);
        await expectStoredCart(page, [{ sizeId: S.ja43, quantity: 1 }]);
        await expect(pdp.header.cartCount).toHaveText('1');
      });

      await test.step('đổi size → lỗi biến mất', async () => {
        await pdp.sizeByLabel('EU 42').click();
        await expect(pdp.addError).toHaveCount(0);
      });

      await test.step('Dunk EU 42 đã có 10 đôi', async () => {
        await setCart(page, [{ sizeId: S.dunk42, quantity: 10 }]);
        await pdp.goto(DUNK);
        await pdp.addSize('EU 42');
        await expect(pdp.addError).toHaveText(MAX_REACHED);
        await expect(dialog.root).toHaveCount(0);
        await expectStoredCart(page, [{ sizeId: S.dunk42, quantity: 10 }]);
      });
    }
  );

  test.describe('desktop 1440', () => {
    test.use({ viewport: DESKTOP_1440 });

    test(
      'TC-13 trang giỏ có hàng',
      { tag: '@smoke' },
      async ({ page, cartPage: cart }, testInfo) => {
        await setCart(page, [
          { sizeId: S.dunk42, quantity: 1 },
          { sizeId: S.precision42, quantity: 2 },
        ]);
        const check = watchCheck(page);
        await cart.goto();

        await expect(page).toHaveTitle('Bag | Nike');
        await expect(cart.heading).toHaveText('Bag');
        await expect(cart.summaryHeading).toBeVisible();
        await expect(cart.items).toHaveCount(2);
        expect(await cart.sizeIds()).toEqual([S.dunk42, S.precision42]);

        await test.step('dòng 1: Dunk EU 42 × 1', async () => {
          const line = cart.item(0);
          await expect(line.name).toHaveText(DUNK_NAME);
          await expect(line.name).toHaveAttribute('href', `/t/${DUNK}`);
          await expect(line.subtitle).toHaveText("Men's Shoes");
          await expect(line.root.getByRole('combobox', { name: 'Size EU 42' })).toBeVisible();
          await expect(line.price).toHaveText('3.519.000 ₫');
          await expect(line.originalPrice).toHaveCount(0);
          await expect(line.remove).toBeVisible();
          await expect(line.decrease).toHaveCount(0);
          await expect(line.qty).toHaveText('1');
          await expect(line.increase).toBeEnabled();
          await expect(line.imageLink).toHaveAttribute('href', `/t/${DUNK}`);
        });

        await test.step('dòng 2: Precision 8 Low EU 42 × 2 (giảm giá)', async () => {
          const line = cart.item(1);
          await expect(line.name).toHaveText('Nike Precision 8 Low');
          await expect(line.size).toHaveText('Size EU 42');
          await expect(line.price).toHaveText('4.000.000 ₫');
          await expect(line.originalPrice).toHaveText('4.238.000 ₫');
          expect(await line.originalPrice.evaluate((el) => el.tagName)).toBe('S');
          await expect(line.decrease).toBeVisible();
          await expect(line.remove).toHaveCount(0);
          await expect(line.qty).toHaveText('2');
        });

        await expectSummary(cart, {
          subtotal: '7.519.000 ₫',
          shipping: 'Free',
          total: '7.519.000 ₫',
          hint: QUALIFY_TEXT,
        });
        await expect(cart.checkout).toBeEnabled();
        await expectBagCount(page, 3);
        await expect(cart.relatedCards.first()).toBeVisible();
        expect(check.requests).toBe(1);
        await docShot(page, testInfo, '02-gio-co-hang');
      }
    );

    test(
      'TC-24 số trên túi ở mọi trang + You Might Also Like',
      { tag: '@regression' },
      async ({ page, cartPage: cart }) => {
        await setCart(page, [
          { sizeId: S.dunk42, quantity: 2 },
          { sizeId: S.precision42, quantity: 1 },
        ]);
        for (const path of ['/', '/w', '/info/delivery', '/cart']) {
          await test.step(path, async () => {
            await page.goto(path, { waitUntil: 'load' });
            await expectBagCount(page, 3);
          });
        }

        await test.step('You Might Also Like theo dòng mua được đầu tiên', async () => {
          await expect(
            cart.related.getByRole('heading', { name: 'You Might Also Like', exact: true })
          ).toBeVisible();
          await expect(cart.relatedCards).toHaveCount(8);
          expect(await cart.relatedNames()).toEqual(expectedRelated(DUNK).map((c) => c.name));
        });
      }
    );
  });

  test(
    'TC-14 số lượng, xoá, phí giao hàng biên',
    { tag: '@regression' },
    async ({ page, cartPage: cart }, testInfo) => {
      await setCart(page, [{ sizeId: S.spizike42, quantity: 1 }]);
      await cart.goto();
      const line = cart.item(0);
      const under = {
        subtotal: '4.999.000 ₫',
        shipping: '30.000 ₫',
        total: '5.029.000 ₫',
        hint: addMoreText(1_000),
      };

      await test.step('ban đầu: dưới ngưỡng 1.000 ₫', async () => {
        await expect(line.qty).toHaveText('1');
        await expectSummary(cart, under);
        expect(under.hint).toBe('Add 1.000 ₫ more to get free delivery.');
      });

      await test.step('tăng lên 2', async () => {
        await line.increase.click();
        await expect(line.qty).toHaveText('2');
        await expectSummary(cart, {
          subtotal: '9.998.000 ₫',
          shipping: 'Free',
          total: '9.998.000 ₫',
          hint: QUALIFY_TEXT,
        });
        await expectStoredCart(page, [{ sizeId: S.spizike42, quantity: 2 }]);
        await expectBagCount(page, 2);
      });

      await test.step('giảm về 1', async () => {
        await line.decrease.click();
        await expect(line.qty).toHaveText('1');
        await expectSummary(cart, under);
      });

      await test.step('xoá → giỏ trống', async () => {
        await line.remove.click();
        await expect(cart.empty).toHaveText(EMPTY_TEXT);
        await expect(cart.shopAllShoes).toHaveAttribute('href', '/w');
        await expect(cart.items).toHaveCount(0);
        await expectEmptySummary(cart);
        await expectBagCount(page, 0);
        await expectStoredCart(page, []);
        await expect(cart.related).toHaveCount(0);
        await docShot(page, testInfo, '04-gio-trong');
      });
    }
  );

  test(
    'TC-15 ngưỡng miễn phí giao hàng',
    { tag: '@regression' },
    async ({ page, cartPage: cart }) => {
      for (const c of cartShipping.cases.filter((x) => x.ui)) {
        await test.step(c.name, async () => {
          await setCart(page, c.items);
          await cart.goto();
          await expectSummary(cart, {
            subtotal: '5.000.000 ₫',
            shipping: 'Free',
            total: '5.000.000 ₫',
            hint: QUALIFY_TEXT,
          });
          expect(c.subtotal).toBe(5_000_000);
        });
      }
    }
  );

  test(
    'TC-16 giới hạn số lượng trong giỏ',
    { tag: '@regression' },
    async ({ page, cartPage: cart }) => {
      await test.step('Dunk 9 → 10', async () => {
        await setCart(page, [{ sizeId: S.dunk42, quantity: 9 }]);
        await cart.goto();
        const line = cart.item(0);
        await expect(line.qty).toHaveText('9');
        await line.increase.click();
        await expect(line.qty).toHaveText('10');
        await expect(line.increase).toBeDisabled();
        await expectStoredCart(page, [{ sizeId: S.dunk42, quantity: 10 }]);
      });

      await test.step('Revolution 8 EU 42 (tồn 1)', async () => {
        await setCart(page, [{ sizeId: S.revolution42, quantity: 1 }]);
        await cart.goto();
        const line = cart.item(0);
        await expect(line.qty).toHaveText('1');
        await expect(line.increase).toBeDisabled();
        await expect(line.lowStock).toHaveText(LOW_STOCK_TEXT);
      });
    }
  );

  test(
    'TC-17 dòng không mua được + tự giảm số lượng',
    { tag: '@regression' },
    async ({ page, cartPage: cart }, testInfo) => {
      await setCart(page, [
        { sizeId: S.dunk42, quantity: 1 },
        { sizeId: S.dunk385, quantity: 1 },
        { sizeId: S.hidden42, quantity: 1 },
        { sizeId: S.missing, quantity: 1 },
        { sizeId: S.vaporfly38, quantity: 5 },
      ]);
      await cart.goto();

      await expect(cart.items).toHaveCount(4);
      expect(await cart.sizeIds()).toEqual([S.dunk42, S.dunk385, S.hidden42, S.vaporfly38]);

      await test.step('size hết hàng', async () => {
        const line = cart.itemBySizeId(S.dunk385);
        await expect(line.notice).toHaveText(SOLD_OUT_TEXT);
        await expect(line.remove).toBeVisible();
        await expect(line.increase).toHaveCount(0);
        await expect(line.decrease).toHaveCount(0);
        await expect(line.qty).toHaveCount(0);
      });

      await test.step('sản phẩm ngừng bán', async () => {
        const line = cart.itemBySizeId(S.hidden42);
        await expect(line.notice).toHaveText(UNAVAILABLE_TEXT);
        await expect(line.name).toBeVisible();
        await expect(line.root.getByRole('link')).toHaveCount(0);
        await expect(line.root.getByRole('combobox')).toHaveCount(0);
        await expect(line.price).toHaveCount(0);
        await expect(line.remove).toBeVisible();
        await expect(line.increase).toHaveCount(0);
      });

      await test.step('vượt tồn kho → tự giảm về 3', async () => {
        const line = cart.itemBySizeId(S.vaporfly38);
        await expect(line.qty).toHaveText('3');
        await expect(line.notice).toHaveText(
          "Only 3 left in this size. We've updated your quantity."
        );
        await expect(line.lowStock).toHaveCount(0);
      });

      await expectSummary(cart, {
        subtotal: '23.346.000 ₫',
        shipping: 'Free',
        total: '23.346.000 ₫',
        hint: QUALIFY_TEXT,
      });
      await expectStoredCart(page, [
        { sizeId: S.dunk42, quantity: 1 },
        { sizeId: S.dunk385, quantity: 1 },
        { sizeId: S.hidden42, quantity: 1 },
        { sizeId: S.vaporfly38, quantity: 3 },
      ]);
      await expectBagCount(page, 6);
      await expect(cart.checkout).toBeEnabled();
      await docShot(page, testInfo, '03-gio-dong-khong-mua-duoc');
    }
  );

  test(
    'TC-18 đổi size trong giỏ',
    { tag: '@regression' },
    async ({ page, cartPage: cart }, testInfo) => {
      const labels = sizesOf(seedBySlug(DUNK).gender).map((s) => s.sizeLabel);

      await test.step('danh sách size + đổi EU 42 → EU 43', async () => {
        await setCart(page, [{ sizeId: S.dunk42, quantity: 2 }]);
        await cart.goto();
        await expect(cart.item(0).qty).toHaveText('2');
        await cart.openSizeSelect(0);
        const options = cart.sizeOptions();
        await expect(options).toHaveCount(13);
        expect((await options.allTextContents()).map((t) => t.trim())).toEqual(labels);
        expect(labels[0]).toBe('EU 38.5');
        expect(labels[12]).toBe('EU 47');
        for (const label of labels) {
          const option = options.filter({ hasText: new RegExp(`^${label}$`) });
          if (label === 'EU 38.5' || label === 'EU 46') await expect(option).toBeDisabled();
          else await expect(option).toBeEnabled();
        }
        await docShot(page, testInfo, '05-doi-size');
        await options.filter({ hasText: /^EU 43$/ }).click();

        await expect(cart.item(0).size).toHaveText('Size EU 43');
        await expect(cart.item(0).qty).toHaveText('2');
        await expectStoredCart(page, [{ sizeId: S.dunk43, quantity: 2 }]);
      });

      await test.step('đổi sang size đã có → gộp, tối đa 10', async () => {
        await setCart(page, [
          { sizeId: S.dunk42, quantity: 2 },
          { sizeId: S.dunk43, quantity: 9 },
        ]);
        await cart.goto();
        await expect(cart.items).toHaveCount(2);
        await cart.chooseSize(0, 'EU 43');
        await expect(cart.items).toHaveCount(1);
        await expect(cart.item(0).size).toHaveText('Size EU 43');
        await expect(cart.item(0).qty).toHaveText('10');
        await expectStoredCart(page, [{ sizeId: S.dunk43, quantity: 10 }]);
      });
    }
  );

  test('TC-19 localStorage hỏng', { tag: '@regression' }, async ({ page, cartPage: cart }) => {
    const errors = collectPageErrors(page);
    const check = watchCheck(page);
    for (const c of cartDirty.cases) {
      await test.step(c.name, async () => {
        await setCart(page, c.raw);
        check.requests = 0;
        await cart.goto();
        if (c.cart.length === 0) {
          await expect(cart.empty).toHaveText(EMPTY_TEXT);
          await expectStoredCart(page, []);
          expect(check.requests).toBe(0);
        } else {
          await expect(cart.items).toHaveCount(1);
          await expect(cart.item(0).qty).toHaveText(String(c.cart[0].quantity));
          await expectStoredCart(page, c.cart);
        }
      });
    }
    expect(errors).toEqual([]);
    expect(check.badResponses).toBe(0);
  });

  test(
    'TC-20 giữ giỏ qua F5, tab mới, đồng bộ hai tab',
    { tag: '@regression' },
    async ({ page, productDetailPage: pdp }) => {
      await pdp.goto(DUNK);
      await pdp.addSize('EU 42');
      await expect(pdp.addedToBag.root).toBeVisible();
      await page.keyboard.press('Escape');

      await test.step('F5', async () => {
        await page.reload({ waitUntil: 'load' });
        await expect(pdp.header.cartCount).toHaveText('1');
      });

      const page2 = await page.context().newPage();
      const cart2 = new CartPage(page2);

      await test.step('tab mới mở /cart', async () => {
        await cart2.goto();
        await expect(cart2.items).toHaveCount(1);
        await expect(cart2.item(0).name).toHaveText(DUNK_NAME);
        await expect(cart2.item(0).qty).toHaveText('1');
      });

      await test.step('tăng ở tab mới → tab cũ cập nhật', async () => {
        await cart2.item(0).increase.click();
        await expect(cart2.item(0).qty).toHaveText('2');
        await expect(pdp.header.cartCount).toHaveText('2');
      });

      await page2.close();
    }
  );

  test(
    'TC-21 Checkout khi chưa đăng nhập',
    { tag: '@regression' },
    async ({ page, cartPage: cart, signInPage, productDetailPage: pdp }) => {
      await setCart(page, [{ sizeId: S.dunk42, quantity: 1 }]);
      await cart.goto();

      await test.step('bấm Checkout → /signin?redirect=/checkout', async () => {
        await expect(cart.checkout).toBeEnabled();
        await cart.checkout.click();
        await expect.poll(() => new URL(page.url()).pathname).toBe('/signin');
        expect(new URL(page.url()).searchParams.get('redirect')).toBe('/checkout');
      });

      await test.step('đăng nhập → /checkout, giỏ giữ nguyên', async () => {
        await signInPage.signIn(accounts.khach1);
        await expect.poll(() => new URL(page.url()).pathname).toBe('/checkout');
        await expect(page).toHaveTitle('Checkout | Nike');
        await expect(
          page.getByRole('main').getByText('Coming Soon', { exact: true })
        ).toBeVisible();
        await expect(cart.header.cartCount).toHaveText('1');
        await expectStoredCart(page, [{ sizeId: S.dunk42, quantity: 1 }]);
      });

      await test.step('Checkout trong popup (đã đăng nhập) → /checkout', async () => {
        await pdp.goto(DUNK);
        await pdp.addSize('EU 43');
        await expect(pdp.addedToBag.viewBagWith(2)).toBeVisible();
        await pdp.addedToBag.checkout.click();
        await expect.poll(() => new URL(page.url()).pathname).toBe('/checkout');
        await expect(pdp.addedToBag.root).toHaveCount(0);
      });
    }
  );

  test(
    'TC-22 Checkout khi đã đăng nhập',
    { tag: '@regression' },
    async ({ page, cartPage: cart, signInPage }) => {
      await signInPage.goto();
      await signInPage.signIn(accounts.khach2);
      await expect.poll(() => new URL(page.url()).pathname).not.toBe('/signin');
      // Chờ app xong điều hướng sau đăng nhập (header có "Hi, …") rồi mới goto — Firefox huỷ goto
      // (NS_BINDING_ABORTED) nếu router còn đang chốt lần điều hướng SPA về "/" (§12, phiên B)
      await expect(
        new HeaderComponent(page).root.getByRole('button', { name: /^Hi, / })
      ).toBeVisible();

      await setCart(page, [{ sizeId: S.revolution42, quantity: 1 }]);
      await cart.goto();
      /** @type {string[]} */
      const paths = [];
      page.on('framenavigated', (f) => {
        if (f === page.mainFrame()) paths.push(new URL(f.url()).pathname);
      });
      await expect(cart.checkout).toBeEnabled();
      await cart.checkout.click();
      await expect.poll(() => new URL(page.url()).pathname).toBe('/checkout');
      expect(paths).not.toContain('/signin');
    }
  );

  test('TC-23 lỗi mạng', { tag: '@regression' }, async ({ page, cartPage: cart }) => {
    await setCart(page, [{ sizeId: S.dunk42, quantity: 1 }]);

    await test.step('(a) 500 → lỗi + Try Again', async () => {
      await page.route(CHECK_URL, fail500);
      await cart.goto();
      await expect(cart.error).toBeVisible();
      await expect(cart.tryAgain).toBeVisible();
      await expect(cart.heading).toHaveText('Bag');
      await expectEmptySummary(cart);
      await page.unroute(CHECK_URL);
      await cart.tryAgain.click();
      await expect(cart.items).toHaveCount(1);
      await expect(cart.item(0).name).toHaveText(DUNK_NAME);
      await expect(cart.total).toHaveText('3.549.000 ₫');
      await expect(cart.error).toHaveCount(0);
    });

    await test.step('(b) chậm 1,5 giây → skeleton', async () => {
      await page.route(CHECK_URL, async (route) => {
        await delay(1_500);
        await route.continue();
      });
      await cart.goto();
      await expect(cart.skeleton).toBeVisible();
      await expect(cart.skeleton).toHaveAttribute('aria-busy', 'true');
      await expect(cart.items).toHaveCount(1);
      await expect(cart.skeleton).toHaveCount(0);
      await page.unroute(CHECK_URL);
    });
  });

  test(
    'TC-26 giỏ trống ban đầu + điều hướng',
    { tag: '@regression' },
    async ({ page, cartPage: cart }) => {
      const check = watchCheck(page);
      await cart.goto();
      await expect(cart.empty).toHaveText(EMPTY_TEXT);
      await expectEmptySummary(cart);
      await expectBagCount(page, 0);
      expect(check.requests).toBe(0);

      await cart.shopAllShoes.click();
      await expect.poll(() => new URL(page.url()).pathname).toBe('/w');
      await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText(
        'Shoes (30)'
      );
    }
  );
});

test.describe('Giỏ hàng — mobile', () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== MOBILE, 'Chỉ chạy ở mobile-chrome');
  });

  test(
    'TC-25 bố cục + thao tác mobile',
    { tag: '@regression' },
    async ({ page, cartPage: cart, productDetailPage: pdp }, testInfo) => {
      await setCart(page, [{ sizeId: S.dunk42, quantity: 2 }]);
      await cart.goto();

      await test.step('/cart một cột', async () => {
        await expect(cart.heading).toHaveText('Bag');
        await expect(cart.mobileSummary).toHaveText('2 items | 7.038.000 ₫');
        await expect(cart.items).toHaveCount(1);
        const img = await cart.item(0).image.boundingBox();
        expect(Math.abs((img?.width ?? 0) - 120)).toBeLessThanOrEqual(2);
        await expect(cart.header.cartCount).toHaveText('2');

        const overflow = await page.evaluate(() => ({
          doc: document.documentElement.scrollWidth - window.innerWidth,
          app: (() => {
            const el = document.getElementById('app-scroll');
            return el ? el.scrollWidth - el.clientWidth : 0;
          })(),
        }));
        expect(overflow.doc).toBeLessThanOrEqual(0);
        expect(overflow.app).toBeLessThanOrEqual(0);
        expect(findVietnamese(await cart.main.innerText())).toEqual([]);
        await docShot(page, testInfo, '06-gio-mobile');
      });

      await test.step('nút Checkout dính đáy', async () => {
        const vh = /** @type {{ height: number }} */ (page.viewportSize()).height;
        const expectStuck = async () => {
          await expect(cart.checkout).toBeInViewport();
          const box = await cart.checkout.boundingBox();
          expect((box?.y ?? 0) + (box?.height ?? 0)).toBeGreaterThanOrEqual(vh - 40);
        };
        await expectStuck();
        await cart.header.scrollTo(100_000);
        await expectStuck();
        await cart.header.scrollTo(0);
      });

      await test.step('popup trên mobile', async () => {
        await pdp.goto('nike-revolution-8');
        await pdp.addSize('EU 41');
        const dialog = pdp.addedToBag;
        await expect(dialog.viewBagWith(3)).toBeVisible();
        const vw = /** @type {{ width: number }} */ (page.viewportSize()).width;
        await expect
          .poll(async () => {
            const box = await dialog.root.boundingBox();
            return box ? Math.round(box.y) : 999;
          })
          .toBeLessThanOrEqual(8);
        const box = await dialog.root.boundingBox();
        expect(Math.abs((box?.width ?? 0) - vw)).toBeLessThanOrEqual(2);
        await docShot(page, testInfo, '07-popup-mobile');
      });
    }
  );
});
