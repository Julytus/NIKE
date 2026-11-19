/* global document, window -- dùng trong page.evaluate (chạy ở trình duyệt) */
import sizeGuide from '../../data/size-guide.json' with { type: 'json' };
import {
  discountPercent,
  expectedList,
  expectedRelated,
  lowStockShown,
  seedBySlug,
  seedProducts,
  sizesOf,
  stockOf,
} from '../../data/seed-products.js';
import { expect, test } from '../../fixtures/index.js';
import { docShot } from '../../utils/doc-shot.js';
import { formatVnd } from '../../utils/format.js';
import { scanVietnamese } from '../../utils/vietnamese.js';

/**
 * Lát `chi-tiet-giay` (plan/chi-tiet-giay.md §6, §9 TC-10 → TC-26): trang `/t/<slug>` — gallery 5 ảnh,
 * ảnh nhỏ, kéo ảnh sang bên (không phóng to, đổi 19/11), giá / "% off", chọn size + lỗi chưa chọn, "Just a few left", "Sold Out",
 * "Size Guide", "Free Delivery and Returns", "You Might Also Like", "Product Not Found", lỗi tải,
 * tải sẵn khi rê chuột, Back giữ vị trí cuộn; mobile. Kết quả mong đợi tính từ `products.json`
 * (`expectedRelated`, `discountPercent`, `lowStockShown`) và `data/size-guide.json`.
 * TC-27 (hồi quy) = chạy lại giao-dien-nike TC-25, tieng-anh-cua-hang TC-10, danh-sach-giay TC-28 + `pnpm test:smoke`.
 */

const MOBILE = 'mobile-chrome';
const DESKTOP_1440 = { width: 1440, height: 900 };
const DUNK = 'nike-dunk-low-retro';
const DUNK_NAME = 'Nike Dunk Low Retro';
const API = {
  get: /\/api\/product\/public\/get\?/,
  related: /\/api\/product\/public\/related\?/,
};
const LOW_STOCK_TEXT = 'Just a few left. Order soon.';
const SIZE_ERROR_TEXT = 'Please select a size.';
const ERROR_RED = 'rgb(211, 0, 5)';
const NOT_FOUND_TEXT =
  "The product you're looking for isn't available. It may have been removed or the link may be incorrect.";
const DELIVERY_TEXT =
  'Free standard delivery on orders of 5.000.000 ₫ or more. Orders under 5.000.000 ₫ have a 30.000 ₫ delivery fee.';
const RETURNS_TEXT = 'Not the right fit? Return your order for free within 30 days.';

/** @typedef {import('../../pages/ProductDetailPage.js').ProductDetailPage} ProductDetailPage */
/** @typedef {import('../../data/seed-products.js').SeedProduct} SeedProduct */

/** Trả 500 cho một API. @param {import('@playwright/test').Route} route */
const fail500 = (route) =>
  route.fulfill({ status: 500, json: { code: 500, message: 'Simulated error' } });

/** @param {number} ms */
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/** Ghi lỗi JS của trang. @param {import('@playwright/test').Page} page */
function collectPageErrors(page) {
  /** @type {string[]} */
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

/** Ghi giá trị `page` của mọi request tới `list`. @param {import('@playwright/test').Page} page */
function collectListPages(page) {
  /** @type {number[]} */
  const pages = [];
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (url.pathname.endsWith('/product/public/list')) {
      pages.push(Number(url.searchParams.get('page') ?? 1));
    }
  });
  return pages;
}

/**
 * So URL hiện tại (path + query, không phụ thuộc thứ tự tham số).
 * @param {import('@playwright/test').Page} page
 * @param {string} expected
 */
async function expectUrl(page, expected) {
  const e = new URL(expected, 'http://x');
  const sorted = (/** @type {URL} */ u) => [...u.searchParams.entries()].sort();
  await expect
    .poll(() => {
      const a = new URL(page.url());
      return { path: a.pathname, params: sorted(a) };
    }, `URL mong đợi ${expected}`)
    .toEqual({ path: e.pathname, params: sorted(e) });
}

/** Tên 8 thẻ "You Might Also Like" mong đợi. @param {string} slug */
const relatedNamesOf = (slug) => expectedRelated(slug).map((c) => c.name);

/** Nhãn các ô size đang `disabled`. @param {ProductDetailPage} pdp */
const disabledSizes = (pdp) =>
  pdp.sizes.evaluateAll((els) =>
    els.filter((el) => el.hasAttribute('disabled')).map((el) => (el.textContent ?? '').trim())
  );

/** Số ô size đang được chọn. @param {ProductDetailPage} pdp */
const checkedSizes = (pdp) => pdp.sizeGrid.locator('[role="radio"][aria-checked="true"]');

/** Chờ ảnh nhỏ hiện tại = `n`. @param {ProductDetailPage} pdp @param {number} n */
const expectCurrentImage = (pdp, n) =>
  expect.poll(() => pdp.currentImage(), `ảnh nhỏ hiện tại = ${n}`).toBe(n);

/**
 * Giá trị cột US của một dòng bảng size theo giới tính (plan §6.5).
 * @param {SeedProduct['gender']} gender
 * @param {{ usMen: string, usWomen: string, usKids: string | null }} row
 */
function usValue(gender, row) {
  if (gender === 'MEN') return row.usMen;
  if (gender === 'WOMEN') return row.usWomen;
  if (gender === 'UNISEX') return `M ${row.usMen} / W ${row.usWomen}`;
  return row.usKids ?? '—';
}

/** Các dòng bảng size mong đợi của sản phẩm. @param {SeedProduct} p */
function sizeGuideRowsOf(p) {
  return sizesOf(p.gender).map(({ sizeValue }) => {
    const eu = String(sizeValue);
    const row = sizeGuide.rows.find((r) => r.eu === eu);
    return row ? [eu, row.uk, usValue(p.gender, row), row.cm] : [eu, '—', '—', '—'];
  });
}

test.describe('Chi tiết giày desktop', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === MOBILE, 'Nhóm desktop (mobile: TC-26)');
  });

  test(
    'TC-10 trang chi tiết mặc định',
    { tag: '@smoke' },
    async ({ page, productDetailPage: pdp }, testInfo) => {
      const errors = collectPageErrors(page);
      const p = seedBySlug(DUNK);
      await pdp.goto(DUNK);

      await expect(page).toHaveTitle(`${DUNK_NAME} | Nike`);
      await expect(pdp.badge).toHaveText('Just In');
      await expect(pdp.heading).toHaveText(DUNK_NAME);
      await expect(pdp.subtitle).toHaveText("Men's Shoes");
      await expect(pdp.price).toHaveText('3.519.000 ₫');
      await expect(pdp.originalPrice).toHaveCount(0);
      await expect(pdp.discount).toHaveCount(0);

      await test.step('gallery + ảnh nhỏ', async () => {
        await expect(pdp.galleryImages).toHaveCount(5);
        for (let n = 1; n <= 5; n += 1) {
          const item = pdp.galleryImage(n);
          await expect(item.getByRole('button')).toHaveCount(0);
          const img = item.getByRole('img');
          await expect(img).toHaveAttribute('src', new RegExp(`/products/${DUNK}/${n}\\.webp$`));
          await expect(img).toHaveAttribute('alt', `${DUNK_NAME}, image ${n} of 5`);
        }
        await expect(pdp.thumbnails).toHaveCount(5);
        await expect(pdp.thumbnail(1)).toHaveAttribute('aria-current', 'true');
        await expect(pdp.thumbnailGroup.locator('[aria-current="true"]')).toHaveCount(1);
      });

      await test.step('lưới size', async () => {
        await expect(pdp.sizeLabel).toHaveText('Select Size');
        await expect(pdp.sizeGuideButton).toHaveText('Size Guide');
        await expect(pdp.sizes).toHaveText(stockOf(p).map((s) => s.sizeLabel));
        expect(await disabledSizes(pdp)).toEqual(['EU 38.5', 'EU 46']);
        await expect(pdp.size(38.5)).toBeDisabled();
        await expect(pdp.size(46)).toBeDisabled();
        await expect(checkedSizes(pdp)).toHaveCount(0);
        await expect(pdp.addToBag).toHaveText('Add to Bag');
        await expect(pdp.addToBag).toBeEnabled();
        await expect(pdp.lowStock).toHaveCount(0);
      });

      await test.step('mô tả + accordion', async () => {
        await expect(pdp.description).toContainText(p.description);
        await expect(pdp.description).toContainText('Style: IQ0157-001');
        await expect(pdp.deliveryToggle).toHaveAttribute('aria-expanded', 'false');
      });

      await test.step('"You Might Also Like"', async () => {
        await expect(pdp.relatedHeading).toBeVisible();
        await expect(pdp.relatedCardList.getByTestId('product-name')).toHaveText(
          relatedNamesOf(DUNK)
        );
        await expect(pdp.relatedCard(0).name).toHaveText('Nike Air Max 95 Big Bubble Premium');
      });

      await expect(page.getByText('Coming Soon')).toHaveCount(0);
      await docShot(page, testInfo, '01-chi-tiet-mac-dinh');
      expect(errors).toEqual([]);
    }
  );

  test(
    'TC-11 từ trang danh sách vào chi tiết, tải sẵn khi rê chuột',
    { tag: '@regression' },
    async ({ page, productListPage: list, productDetailPage: pdp }) => {
      const slug = 'nike-precision-8-low';
      await list.goto('/w/basketball', { gender: 'men' });
      await expect(list.heading).toHaveText("Men's Basketball Shoes (1)");
      const card = list.card(0);
      await expect(card.name).toHaveText('Nike Precision 8 Low');
      const cardName = await card.name.textContent();
      const cardPrice = await card.price.textContent();

      const preload = page.waitForRequest(
        (req) => API.get.test(req.url()) && new URL(req.url()).searchParams.get('slug') === slug
      );
      await card.root.hover();
      await preload;

      await card.root.click();
      await expectUrl(page, `/t/${slug}`);
      await expect(pdp.heading).toHaveText('Nike Precision 8 Low');
      await expect(pdp.heading).toHaveText(/** @type {string} */ (cardName));
      await expect(pdp.badge).toHaveText('Sale');
      await expect(pdp.price).toHaveText('2.000.000 ₫');
      await expect(pdp.price).toHaveText(/** @type {string} */ (cardPrice));
      await expect(pdp.originalPrice).toHaveText('2.119.000 ₫');
      await expect(pdp.discount).toHaveText('5% off');

      await page.goBack();
      await expectUrl(page, '/w/basketball?gender=men');
      await expect(list.heading).toHaveText("Men's Basketball Shoes (1)");
    }
  );

  test('TC-12 giá giảm và "% off"', { tag: '@regression' }, async ({ productDetailPage: pdp }) => {
    for (const id of [4, 7, 12, 19, 21, 27]) {
      const p = /** @type {SeedProduct} */ (seedProducts.find((x) => x.id === id));

      await test.step(`${id} ${p.slug}`, async () => {
        await pdp.goto(p.slug);
        await expect(pdp.heading).toHaveText(p.name);
        await expect(pdp.price).toHaveText(formatVnd(/** @type {number} */ (p.salePrice)));
        await expect(pdp.originalPrice).toHaveText(formatVnd(p.price));
        await expect(pdp.discount).toHaveText(`${discountPercent(p)}% off`);
        await expect(pdp.discount).toHaveText(id === 19 ? '5% off' : '20% off');
      });
    }
  });

  test(
    'TC-13 chọn size + lỗi chưa chọn size',
    { tag: '@smoke' },
    async ({ page, productDetailPage: pdp }, testInfo) => {
      await pdp.goto(DUNK);
      await expect(pdp.heading).toHaveText(DUNK_NAME);

      await test.step('bấm "Add to Bag" khi chưa chọn size', async () => {
        await pdp.addToBag.click();
        await expect(pdp.sizeError).toHaveText(SIZE_ERROR_TEXT);
        await expect(pdp.sizeError).toHaveAttribute('role', 'alert');
        await expect(pdp.sizeLabel).toHaveCSS('color', ERROR_RED);
        await expect(pdp.sizeGrid).toHaveAttribute('aria-invalid', 'true');
        await expect(pdp.sizeGrid).toBeInViewport();
        await docShot(page, testInfo, '02-loi-chua-chon-size');
      });

      await test.step('chọn EU 42', async () => {
        await pdp.sizeByLabel('EU 42').click();
        await expect(pdp.size(42)).toHaveAttribute('aria-checked', 'true');
        await expect(pdp.sizeError).toHaveCount(0);
        await expect(pdp.sizeGrid).not.toHaveAttribute('aria-invalid', 'true');
      });

      await test.step('bấm "Add to Bag" khi đã chọn size', async () => {
        await pdp.addToBag.click();
        await expect(pdp.sizeError).toHaveCount(0);
        await expectUrl(page, `/t/${DUNK}`);
      });

      await test.step('phím mũi tên', async () => {
        await pdp.size(42).focus();
        await page.keyboard.press('ArrowRight');
        await expect(pdp.size(42.5)).toHaveAttribute('aria-checked', 'true');
        await expect(pdp.size(42)).toHaveAttribute('aria-checked', 'false');
        await expect(pdp.size(38.5)).toBeDisabled();
      });
    }
  );

  test(
    'TC-14 cảnh báo sắp hết hàng',
    { tag: '@regression' },
    async ({ page, productDetailPage: pdp }, testInfo) => {
      await test.step('nike-vaporfly-4: tổng tồn 3', async () => {
        const p = seedBySlug('nike-vaporfly-4');
        expect(lowStockShown(p)).toBe(true);
        await pdp.goto(p.slug);
        await expect(pdp.lowStock).toHaveText(LOW_STOCK_TEXT);
        const disabled = await disabledSizes(pdp);
        expect(disabled).toHaveLength(10);
        expect(disabled).not.toContain('EU 38');
        await expect(pdp.size(38)).toBeEnabled();
        await pdp.size(38).click();
        await expect(pdp.size(38)).toHaveAttribute('aria-checked', 'true');
        await expect(pdp.lowStock).toHaveText(LOW_STOCK_TEXT);
        await docShot(page, testInfo, '03-sap-het-hang');
      });

      await test.step('nike-revolution-8: chỉ EU 42 còn 1', async () => {
        const p = seedBySlug('nike-revolution-8');
        expect([lowStockShown(p), lowStockShown(p, 'EU 42'), lowStockShown(p, 'EU 41')]).toEqual([
          false,
          true,
          false,
        ]);
        await pdp.goto(p.slug);
        await expect(pdp.heading).toHaveText(p.name);
        await expect(pdp.lowStock).toHaveCount(0);
        await pdp.size(42).click();
        await expect(pdp.lowStock).toHaveText(LOW_STOCK_TEXT);
        await pdp.size(41).click();
        await expect(pdp.lowStock).toHaveCount(0);
      });
    }
  );

  test(
    'TC-15 hết hàng',
    { tag: '@regression' },
    async ({ page, productDetailPage: pdp }, testInfo) => {
      const p = seedBySlug('nike-p-6000');
      await pdp.goto(p.slug);
      await expect(pdp.heading).toHaveText(p.name);
      await expect(pdp.badge).toHaveText('Sold Out');
      await expect(pdp.sizes).toHaveCount(11);
      expect(await disabledSizes(pdp)).toHaveLength(11);
      await expect(pdp.addToBag).toHaveText('Sold Out');
      await expect(pdp.addToBag).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Add to Bag', exact: true })).toHaveCount(0);
      await expect(pdp.lowStock).toHaveCount(0);
      await docShot(page, testInfo, '04-het-hang');

      await pdp.sizeGuideButton.click();
      await expect(pdp.sizeGuide.root).toBeVisible();
      await expect(pdp.sizeGuide.rows).toHaveCount(11);
    }
  );

  test.describe('desktop 1440', () => {
    test.use({ viewport: DESKTOP_1440 });

    test(
      'TC-16 gallery: nút ‹ › và ảnh nhỏ',
      { tag: '@regression' },
      async ({ productDetailPage: pdp }) => {
        await pdp.goto(DUNK);
        await expect(pdp.galleryImages).toHaveCount(5);

        await test.step('ban đầu', async () => {
          await expect(pdp.prevImage).toHaveAccessibleName('Previous image');
          await expect(pdp.nextImage).toHaveAccessibleName('Next image');
          await expect(pdp.prevImage).toBeDisabled();
          await expectCurrentImage(pdp, 1);
          expect(await pdp.galleryVisibleFraction(1)).toBeGreaterThan(0.99);
          const second = await pdp.galleryVisibleFraction(2);
          expect(second).toBeGreaterThanOrEqual(0.3);
          expect(second).toBeLessThanOrEqual(0.7);
        });

        await test.step('Next 1 lần', async () => {
          await pdp.nextImage.click();
          await expectCurrentImage(pdp, 2);
          expect((await pdp.galleryScroll()).scrollLeft).toBeGreaterThan(0);
        });

        await test.step('Next thêm 3 lần → ảnh 5', async () => {
          for (const n of [3, 4, 5]) {
            await pdp.nextImage.click();
            await expectCurrentImage(pdp, n);
          }
          await expect(pdp.nextImage).toBeDisabled();
        });

        await test.step('Previous → ảnh 4', async () => {
          await pdp.prevImage.click();
          await expectCurrentImage(pdp, 4);
        });

        await test.step('"Show image 1" rồi "Show image 3"', async () => {
          await pdp.thumbnail(1).click();
          await expectCurrentImage(pdp, 1);
          await expect(pdp.prevImage).toBeDisabled();
          await pdp.thumbnail(3).click();
          await expectCurrentImage(pdp, 3);
          await expect.poll(() => pdp.galleryVisibleFraction(3)).toBeGreaterThan(0.95);
        });
      }
    );

    test(
      'TC-17 kéo ảnh sang bên',
      { tag: '@regression' },
      async ({ page, productDetailPage: pdp }, testInfo) => {
        await pdp.goto(DUNK);
        await expect(pdp.galleryImages).toHaveCount(5);
        await expectCurrentImage(pdp, 1);
        const step = await pdp.galleryImageWidth();

        await test.step('con trỏ "grab"', async () => {
          await expect(pdp.galleryImage(1)).toHaveCSS('cursor', 'grab');
        });

        await test.step('kéo trái 40% → ảnh 2', async () => {
          await pdp.dragGallery(-step * 0.4);
          await expectCurrentImage(pdp, 2);
          expect((await pdp.galleryScroll()).scrollLeft).toBeGreaterThan(0);
        });

        await test.step('kéo trái thêm 3 lần → ảnh 5', async () => {
          for (const n of [3, 4, 5]) {
            await pdp.dragGallery(-step * 0.4);
            await expectCurrentImage(pdp, n);
          }
          await expect(pdp.nextImage).toBeDisabled();
          await docShot(page, testInfo, '05-keo-anh');
        });

        await test.step('kéo phải 40% → ảnh 4', async () => {
          await pdp.dragGallery(step * 0.4);
          await expectCurrentImage(pdp, 4);
        });

        await test.step('kéo 5% → về ảnh cũ', async () => {
          // ảnh 4 nằm trọn đầu khung trước và sau khi kéo 5% (thả ra là trượt về chỗ cũ)
          await expect.poll(() => pdp.galleryVisibleFraction(4)).toBeGreaterThan(0.99);
          await pdp.dragGallery(-step * 0.05);
          await expect.poll(() => pdp.galleryVisibleFraction(4)).toBeGreaterThan(0.99);
          await expectCurrentImage(pdp, 4);
        });

        await test.step('bấm ảnh không mở gì', async () => {
          await pdp.galleryImage(4).click();
          await expect(page.getByRole('dialog')).toHaveCount(0);
          await expectUrl(page, `/t/${DUNK}`);
        });
      }
    );

    test(
      'TC-21 "You Might Also Like" + sang sản phẩm khác',
      { tag: '@regression' },
      async ({ productDetailPage: pdp }) => {
        const slug = 'nike-mercurial-vapor-17-elite';
        const names = [
          'Nike Phantom 6 Low Academy',
          DUNK_NAME,
          'Nike Air Max 95 Big Bubble Premium',
          'Nike Alphafly 4',
          "Ja 4 'Blur' EP",
          "Caitlin 1 'Midnight Fever'",
          "Air Jordan 1 Low SE 'Magic Ball'",
          "Jordan Spizike Low 'Jam Central'",
        ];
        expect(relatedNamesOf(slug)).toEqual(names);
        await pdp.goto(slug);

        await test.step('dải 8 thẻ + nút cuộn', async () => {
          await expect(pdp.relatedCardList.getByTestId('product-name')).toHaveText(names);
          await expect(pdp.relatedPrev).toBeDisabled();
          await pdp.relatedNext.click();
          await expect(pdp.relatedPrev).toBeEnabled();
        });

        await test.step('chọn EU 42 + ảnh 3', async () => {
          await pdp.size(42).click();
          await expect(pdp.size(42)).toHaveAttribute('aria-checked', 'true');
          await pdp.thumbnail(3).click();
          await expectCurrentImage(pdp, 3);
        });

        await test.step('bấm thẻ "Nike Dunk Low Retro"', async () => {
          await pdp.relatedCardList
            .filter({
              has: pdp.page.getByTestId('product-name').getByText(DUNK_NAME, { exact: true }),
            })
            .click();
          await expectUrl(pdp.page, `/t/${DUNK}`);
          await expect(pdp.heading).toHaveText(DUNK_NAME);
          await expect.poll(() => pdp.scrollTop()).toBe(0);
          await expect(checkedSizes(pdp)).toHaveCount(0);
          await expectCurrentImage(pdp, 1);
          await expect(pdp.relatedCardList).toHaveCount(8);
          await expect(pdp.relatedCard(0).name).toHaveText('Nike Air Max 95 Big Bubble Premium');
        });
      }
    );
  });

  for (const [i, c] of sizeGuide.cases.entries()) {
    test(
      `TC-18 bảng size theo giới tính — ${c.gender} ${c.slug}`,
      { tag: '@regression' },
      async ({ page, productDetailPage: pdp }, testInfo) => {
        const p = seedBySlug(c.slug);
        expect(p.gender).toBe(c.gender);
        const dialog = pdp.sizeGuide;
        await pdp.goto(c.slug);
        await expect(pdp.heading).toHaveText(p.name);
        await pdp.sizeGuideButton.click();

        await expect(dialog.root).toBeVisible();
        await expect(page.getByRole('dialog', { name: sizeGuide.title })).toBeVisible();
        await expect(dialog.title).toBeVisible();
        await expect(dialog.root.getByText(p.subtitle, { exact: true })).toBeVisible();
        await expect(dialog.root.getByText(sizeGuide.intro, { exact: true })).toBeVisible();
        expect((await dialog.columnHeaders()).map((t) => t.trim())).toEqual([
          'EU',
          'UK',
          c.usTitle,
          'Foot Length (cm)',
        ]);
        expect(sizeGuide.usColumnTitle[c.gender]).toBe(c.usTitle);
        await expect(dialog.rows).toHaveCount(c.rowCount);
        expect(await dialog.euColumn()).toEqual(sizesOf(p.gender).map((s) => String(s.sizeValue)));
        expect(await dialog.row(c.sampleRow[0])).toEqual(c.sampleRow);
        expect(await dialog.cells()).toEqual(sizeGuideRowsOf(p));
        await expect(dialog.selectedRow).toHaveCount(0);
        if (i === 0) await docShot(page, testInfo, '06-bang-size');

        await dialog.close.click();
        await expect(dialog.root).toHaveCount(0);
      }
    );
  }

  test(
    'TC-19 bảng size đánh dấu size đang chọn',
    { tag: '@regression' },
    async ({ page, productDetailPage: pdp }) => {
      await pdp.goto('nike-air-force-1-07');
      await pdp.size(42).click();
      await expect(pdp.size(42)).toHaveAttribute('aria-checked', 'true');
      await pdp.sizeGuideButton.click();

      await expect(pdp.sizeGuide.selectedRow).toHaveCount(1);
      await expect(pdp.sizeGuide.selectedRow.locator('td, th').first()).toHaveText('42');

      await page.keyboard.press('Escape');
      await expect(pdp.sizeGuide.root).toHaveCount(0);
      await expect(pdp.size(42)).toHaveAttribute('aria-checked', 'true');
    }
  );

  test(
    'TC-20 accordion "Free Delivery and Returns"',
    { tag: '@regression' },
    async ({ page, productDetailPage: pdp }) => {
      await pdp.goto(DUNK);
      await expect(pdp.deliveryToggle).toHaveAttribute('aria-expanded', 'false');
      await pdp.deliveryToggle.click();
      await expect(pdp.deliveryToggle).toHaveAttribute('aria-expanded', 'true');

      await expect(pdp.deliveryPanel).toContainText(DELIVERY_TEXT);
      await expect(pdp.deliveryPanel).toContainText(RETURNS_TEXT);
      const delivery = pdp.deliveryPanel.getByRole('link', { name: 'Delivery', exact: true });
      const returns = pdp.deliveryPanel.getByRole('link', { name: 'Returns', exact: true });
      await expect(delivery).toHaveAttribute('href', '/info/delivery');
      await expect(returns).toHaveAttribute('href', '/info/returns');

      await delivery.click();
      await expectUrl(page, '/info/delivery');

      await page.goBack();
      await expectUrl(page, `/t/${DUNK}`);
      await expect(pdp.heading).toHaveText(DUNK_NAME);
      await pdp.deliveryToggle.click();
      await pdp.deliveryToggle.click();
      await expect(pdp.deliveryToggle).toHaveAttribute('aria-expanded', 'false');
    }
  );

  test(
    'TC-22 Product Not Found',
    { tag: '@regression' },
    async ({ page, productDetailPage: pdp, notFoundPage, productListPage: list }, testInfo) => {
      for (const slug of ['nike-air-max-plus-premium', 'khong-co']) {
        await test.step(slug, async () => {
          await pdp.goto(slug);
          await expect(pdp.notFound).toBeVisible();
          await expect(pdp.heading).toHaveText('Product Not Found');
          await expect(pdp.notFound.getByText(NOT_FOUND_TEXT, { exact: true })).toBeVisible();
          await expect(
            pdp.notFound.getByRole('link', { name: 'Shop All Shoes', exact: true })
          ).toHaveAttribute('href', '/w');
          await expect(
            pdp.notFound.getByRole('link', { name: 'Back to Home', exact: true })
          ).toHaveAttribute('href', '/');
          await expect(pdp.header.root).toBeVisible();
          await expect(pdp.footer.root).toBeVisible();
          await expect(page).toHaveTitle('Product Not Found | Nike');
          await expect(pdp.gallery).toHaveCount(0);
          await expect(notFoundPage.message).toHaveCount(0);
          if (slug === 'nike-air-max-plus-premium') {
            await docShot(page, testInfo, '07-khong-tim-thay');
          }
        });
      }

      await pdp.notFound.getByRole('link', { name: 'Shop All Shoes', exact: true }).click();
      await expectUrl(page, '/w');
      await expect(list.heading).toHaveText('Shoes (30)');
    }
  );

  test('TC-23 lỗi mạng', { tag: '@regression' }, async ({ page, productDetailPage: pdp }) => {
    await test.step('(a) get trả 500 → "Try Again"', async () => {
      await page.route(API.get, fail500);
      await pdp.goto(DUNK);
      await expect(pdp.loadError).toBeVisible({ timeout: 15_000 });
      await expect(
        page.getByText('Check your connection and try again.', { exact: true })
      ).toBeVisible();
      await expect(pdp.retryButton).toBeVisible();
      await page.unroute(API.get);
      await pdp.retryButton.click();
      await expect(pdp.heading).toHaveText(DUNK_NAME);
    });

    await test.step('(b) related trả 500 → chỉ khối gợi ý lỗi', async () => {
      await page.route(API.related, fail500);
      await pdp.goto(DUNK);
      await expect(pdp.heading).toHaveText(DUNK_NAME);
      await expect(pdp.relatedError).toBeVisible({ timeout: 15_000 });
      await expect(pdp.sizeGrid).toBeVisible();
      await expect(pdp.addToBag).toHaveText('Add to Bag');
      await expect(pdp.relatedRetry).toBeVisible();
      await page.unroute(API.related);
      await pdp.relatedRetry.click();
      await expect(pdp.relatedCardList).toHaveCount(8);
    });

    await test.step('(c) get chậm 1,5 giây → skeleton', async () => {
      await page.route(API.get, async (route) => {
        await delay(1500);
        await route.continue();
      });
      await page.goto(`/t/${DUNK}`, { waitUntil: 'commit' });
      await expect(pdp.skeleton).toBeVisible();
      await expect(pdp.skeleton).toHaveAttribute('aria-busy', 'true');
      await expect(pdp.skeleton).toHaveCount(0);
      await expect(pdp.heading).toHaveText(DUNK_NAME);
      await page.unroute(API.get);
    });
  });

  test(
    'TC-24 Back giữ vị trí cuộn trang danh sách',
    { tag: '@regression' },
    async ({ page, productListPage: list, productDetailPage: pdp }) => {
      await list.goto();
      await expect(list.cards).toHaveCount(12);
      await expect(async () => {
        await list.scrollToBottom();
        expect(await list.cards.count()).toBeGreaterThanOrEqual(24);
      }).toPass({ timeout: 15_000 });

      const expected = expectedList({}, { limit: 48 }).items[19];
      const card = list.card(19);
      await expect(card.name).toHaveText(expected.name);
      await card.root.scrollIntoViewIfNeeded();
      await card.root.click();
      await expectUrl(page, `/t/${expected.slug}`);
      await expect(pdp.heading).toHaveText(expected.name);

      const pages = collectListPages(page);
      await page.goBack();
      await expectUrl(page, '/w');
      expect(await list.cards.count()).toBeGreaterThanOrEqual(24);
      await expect(list.skeletons).toHaveCount(0);
      await expect(list.card(19).root).toBeInViewport();
      expect(pages.filter((p) => p === 1)).toEqual([]);
    }
  );

  test(
    'TC-25 từ gợi ý tìm kiếm vào chi tiết',
    { tag: '@regression' },
    async ({ page, homePage, productDetailPage: pdp }) => {
      const { search } = homePage.header;
      await homePage.goto();
      await homePage.header.searchButton.click();
      await search.type('pegasus');
      await search.suggestions
        .filter({
          has: page.getByTestId('product-name').getByText('Nike Pegasus 42', { exact: true }),
        })
        .click();

      await expectUrl(page, '/t/nike-pegasus-42');
      await expect(pdp.heading).toHaveText('Nike Pegasus 42');
      await expect(pdp.subtitle).toHaveText("Women's Road Running Shoes");
      await expect(pdp.sizes).toHaveCount(11);
      expect(await disabledSizes(pdp)).toEqual(['EU 36', 'EU 40.5']);
    }
  );
});

test.describe('Chi tiết giày mobile', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== MOBILE, 'Chỉ chạy ở mobile-chrome');
  });

  test(
    'TC-26 bố cục + thao tác mobile',
    { tag: '@smoke' },
    async ({ page, productDetailPage: pdp }, testInfo) => {
      await pdp.goto(DUNK);
      await expect(pdp.heading).toHaveText(DUNK_NAME);
      await expect(pdp.galleryImages).toHaveCount(5);
      const screenWidth = /** @type {{ width: number }} */ (page.viewportSize()).width;

      await test.step('bố cục', async () => {
        const h1 = /** @type {import('@playwright/test').BoundingBox} */ (
          await pdp.heading.boundingBox()
        );
        const gallery = /** @type {import('@playwright/test').BoundingBox} */ (
          await pdp.gallery.boundingBox()
        );
        expect(h1.y).toBeLessThan(gallery.y);
        const img = /** @type {import('@playwright/test').BoundingBox} */ (
          await pdp.galleryImage(1).boundingBox()
        );
        expect(Math.abs(img.width - screenWidth)).toBeLessThanOrEqual(2);
        await expect(pdp.prevImage).toHaveCount(0);
        await expect(pdp.nextImage).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Previous image', exact: true })).toHaveCount(
          0
        );
        await expect(page.getByRole('button', { name: 'Next image', exact: true })).toHaveCount(0);
        await docShot(page, testInfo, '08-chi-tiet-mobile');
      });

      await test.step('vuốt sang ảnh 2, chạm ảnh không mở gì', async () => {
        const { clientWidth } = await pdp.galleryScroll();
        await pdp.scrollGalleryTo(clientWidth);
        await expectCurrentImage(pdp, 2);
        await pdp.galleryImage(2).tap();
        await expect(page.getByRole('dialog')).toHaveCount(0);
        await expectCurrentImage(pdp, 2);
      });

      await test.step('lưới size 3 cột + lỗi chưa chọn size', async () => {
        expect(await pdp.sizeColumnCount()).toBe(3);
        const button = /** @type {import('@playwright/test').BoundingBox} */ (
          await pdp.addToBag.boundingBox()
        );
        expect(Math.abs(button.width - (screenWidth - 48))).toBeLessThanOrEqual(2);
        await pdp.addToBag.tap();
        await expect(pdp.sizeError).toHaveText(SIZE_ERROR_TEXT);
        await expect(pdp.sizeGrid).toBeInViewport();
      });

      await test.step('không cuộn ngang, không chữ tiếng Việt', async () => {
        const widths = await page.evaluate(() => ({
          doc: document.documentElement.scrollWidth,
          app: document.getElementById('app-scroll')?.scrollWidth ?? 0,
          inner: window.innerWidth,
        }));
        expect(widths.doc).toBeLessThanOrEqual(widths.inner);
        expect(widths.app).toBeLessThanOrEqual(widths.inner);
        expect(await scanVietnamese(pdp.main)).toEqual([]);
      });
    }
  );
});
