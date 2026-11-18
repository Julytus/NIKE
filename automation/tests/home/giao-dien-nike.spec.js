import AxeBuilder from '@axe-core/playwright';

import { accounts, storageStateOf } from '../../data/accounts.js';
import nav from '../../data/nav-links.json' with { type: 'json' };
import {
  expectedCategories,
  expectedNewArrivals,
  expectedSuggest,
} from '../../data/seed-products.js';
import { expect, test } from '../../fixtures/index.js';
import { docShot } from '../../utils/doc-shot.js';
import { formatVnd } from '../../utils/format.js';

/**
 * Lát `giao-dien-nike` (plan/giao-dien-nike.md §6, §9 TC-10 → TC-30): khung giao diện Nike —
 * header, mega menu, khung tìm kiếm, dải thông báo, footer, menu trượt; trang chủ; trang thông tin; trang tạm.
 * Href mong đợi dựng từ `data/nav-links.json` + `expectedCategories()`, sản phẩm từ `products.json`.
 */

const NOT_FOUND = 'Trang bạn đang tìm kiếm không tồn tại.';
const ANNOUNCEMENT = 'Miễn phí giao hàng cho đơn từ 5.000.000 ₫ & đổi trả trong 30 ngày';
const MOBILE = 'mobile-chrome';

const API = {
  categories: '**/api/product-category/public/list',
  newArrivals: '**/api/product/public/new-arrivals',
  suggest: '**/api/product/public/suggest**',
};

/**
 * Ghép đường dẫn gốc với tham số phạm vi (vd `/w/bong-ro` + `{gioiTinh: 'nam'}`).
 * @param {string} base
 * @param {Record<string, string>} scope
 */
function withScope(base, scope) {
  const url = new URL(base, 'http://x');
  for (const [k, v] of Object.entries(scope)) url.searchParams.set(k, v);
  return `${url.pathname}${url.search}`;
}

/**
 * So href theo path + từng tham số (không phụ thuộc thứ tự / cách mã hoá dấu phẩy).
 * @param {string | null} actual
 * @param {string} expected
 */
function expectSameHref(actual, expected) {
  expect(actual, `href mong đợi ${expected}`).not.toBeNull();
  const a = new URL(/** @type {string} */ (actual), 'http://x');
  const e = new URL(expected, 'http://x');
  expect(a.pathname, `path của ${actual}`).toBe(e.pathname);
  const sorted = (/** @type {URL} */ u) => [...u.searchParams.entries()].sort();
  expect(sorted(a), `tham số của ${actual}`).toEqual(sorted(e));
}

/** @param {import('@playwright/test').Locator} locator @param {string} expected */
async function expectHref(locator, expected) {
  expectSameHref(await locator.getAttribute('href'), expected);
}

/** URL hiện tại của trang. @param {import('@playwright/test').Page} page */
const currentUrl = (page) => new URL(page.url());

/** Ghi lại lỗi JS của trang. @param {import('@playwright/test').Page} page */
function collectPageErrors(page) {
  /** @type {string[]} */
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

/** 13 link mong đợi của mega menu cho một mục (theo cột). @param {Record<string, string>} scope */
function megaLinksOf(scope) {
  return [
    ...expectedCategories().map((c) => ({ label: c.name, href: withScope(`/w/${c.slug}`, scope) })),
    ...nav.featured.map((l) => ({ label: l.label, href: withScope(l.href, scope) })),
    ...nav.priceRanges.map((l) => ({ label: l.label, href: withScope(l.href, scope) })),
  ];
}

/** Trả 500 cho một API. @param {import('@playwright/test').Route} route */
const fail500 = (route) =>
  route.fulfill({ status: 500, json: { code: 500, message: 'Lỗi giả lập' } });

test.describe('Khung cửa hàng desktop', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === MOBILE, 'Nhóm desktop');
  });

  test('TC-10 trang chủ đầy đủ', { tag: '@smoke' }, async ({ page, homePage }, testInfo) => {
    const errors = collectPageErrors(page);
    const arrivals = expectedNewArrivals();
    const categories = expectedCategories().filter((c) => c.productCount > 0);

    await homePage.goto();

    await expect(page).toHaveTitle('Nike. Just Do It.');
    await expect(homePage.heroHeading).toBeVisible();
    await expectHref(homePage.shopNowLink, '/w?nhan=moi-ve');
    await expectHref(homePage.allShoesLink, '/w');

    await expect(homePage.newArrivalCards).toHaveCount(arrivals.length);
    expect(arrivals).toHaveLength(8);
    for (const [i, product] of arrivals.entries()) {
      const card = homePage.newArrivalCard(i);
      await expect(card.name).toHaveText(product.name);
      await expect(card.badge).toHaveText('Mới về');
      await expect(card.price).toHaveText(formatVnd(product.salePrice ?? product.price));
    }
    const first = homePage.newArrivalCard(0);
    await expect(first.name).toHaveText('Nike Dunk Low Retro');
    await expect(first.price).toHaveText('3.519.000 ₫');
    expectSameHref(await first.href(), '/t/nike-dunk-low-retro');

    await expectHref(homePage.shopJordanLink, '/w/jordan');

    await expect(homePage.categoryTiles).toHaveCount(categories.length);
    for (const [i, category] of categories.entries()) {
      const tile = homePage.categoryTiles.nth(i);
      await expect(tile).toContainText(category.name);
      await expect(tile).toContainText(`${category.productCount} sản phẩm`);
      await expectHref(tile, `/w/${category.slug}`);
    }
    await expect(homePage.categoryTile('Lifestyle')).toContainText('12 sản phẩm');

    await expect(homePage.footer.root).toBeVisible();
    await docShot(page, testInfo, '01-trang-chu');
    expect(errors).toEqual([]);
  });

  test('TC-11 dải "Mới về" cuộn ngang', { tag: '@regression' }, async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.newArrivalCards).toHaveCount(expectedNewArrivals().length);
    await expect(homePage.prevButton).toBeDisabled();
    await expect(homePage.nextButton).toBeEnabled();

    let clicks = 0;
    await expect
      .poll(
        async () => {
          if (await homePage.nextButton.isEnabled()) {
            await homePage.nextButton.click();
            clicks += 1;
          }
          return homePage.nextButton.isDisabled();
        },
        { intervals: [700], timeout: 10_000 }
      )
      .toBe(true);

    expect(clicks).toBeLessThanOrEqual(6);
    await expect(homePage.nextButton).toBeDisabled();
    await expect(homePage.prevButton).toBeEnabled();
    await expect(
      homePage.newArrivalCards.filter({ hasText: "Air Jordan 1 Low SE 'Lola Bunny'" })
    ).toBeInViewport();
  });

  test(
    'TC-12 trạng thái tải / lỗi (network mocking)',
    { tag: '@regression' },
    async ({ page, homePage }) => {
      await test.step('(a) "Mới về" lỗi rồi thử lại', async () => {
        await page.route(API.newArrivals, fail500);
        await homePage.goto();
        await expect(homePage.newArrivalsError).toBeVisible();
        await expect(homePage.newArrivalsRetry).toBeVisible();

        await page.unroute(API.newArrivals);
        await homePage.newArrivalsRetry.click();
        await expect(homePage.newArrivalCards).toHaveCount(expectedNewArrivals().length);
      });

      await test.step('(b) danh mục đang tải', async () => {
        await page.route(API.categories, async (route) => {
          await new Promise((r) => setTimeout(r, 1500));
          await route.continue();
        });
        await homePage.goto();
        await expect(homePage.categories).toHaveAttribute('aria-busy', 'true');
        await expect(homePage.categories.locator('[data-slot="skeleton"]')).toHaveCount(5);
        await expect(homePage.categoryTiles).toHaveCount(5);
        await expect(homePage.categories).not.toHaveAttribute('aria-busy', 'true');
        await page.unroute(API.categories);
      });

      await test.step('(c) danh mục lỗi: khối lỗi, mega menu không có cột "Danh mục"', async () => {
        await page.route(API.categories, fail500);
        await homePage.goto();
        await expect(homePage.categoriesError).toBeVisible();
        await expect(homePage.categoriesRetry).toBeVisible();

        await homePage.header.hoverNav('Nam');
        await expect(homePage.header.megaColumn('Nổi bật')).toBeVisible();
        await expect(homePage.header.megaColumn('Theo giá')).toBeVisible();
        await expect(homePage.header.megaColumn('Danh mục')).toHaveCount(0);
      });
    }
  );

  test('TC-13 header desktop + link', { tag: '@regression' }, async ({ page, homePage }) => {
    const { header } = homePage;
    await homePage.goto();

    await expect(header.jordanLink).toBeVisible();
    await expect(header.jordanLink.locator('svg')).toHaveCount(1);
    await expectHref(header.jordanLink, '/w/jordan');
    await expectHref(header.findStoreLink, '/thong-tin/tim-cua-hang');
    await expectHref(header.helpLink, '/thong-tin/tro-giup');
    await expect(header.registerButton).toHaveText('Tham gia');
    await expect(header.loginButton).toBeVisible();
    await expectHref(header.logo, '/');
    for (const item of nav.navItems) {
      await expect(header.navLink(item.label)).toBeVisible();
      await expectHref(header.navLink(item.label), item.href);
    }
    await expectHref(header.favoritesLink, '/yeu-thich');
    await expectHref(header.cartLink, '/gio-hang');

    await expect(header.announcement).toContainText(ANNOUNCEMENT);
    await header.announcementDetails.click();
    await expect(page).toHaveURL(/\/thong-tin\/giao-hang$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Giao hàng' })).toBeVisible();
  });

  test(
    'TC-14 mega menu 5 mục (data-driven)',
    { tag: '@regression' },
    async ({ page, homePage }, testInfo) => {
      const { header } = homePage;
      await homePage.goto();
      await expect(homePage.categoryTiles.first()).toBeVisible();

      for (const item of nav.navItems) {
        await test.step(item.label, async () => {
          await header.hoverNav(item.label);
          for (const column of nav.megaColumns) {
            await expect(header.megaColumn(column)).toBeVisible();
          }
          const expected = megaLinksOf(item.scope);
          expect(expected).toHaveLength(13);
          await expect(header.megaMenu.getByRole('link')).toHaveCount(13);
          for (const link of expected) {
            await expectHref(header.megaLink(link.label), link.href);
          }
          if (item.label === 'Nam') await docShot(page, testInfo, '02-mega-menu');

          await homePage.heroHeading.hover();
          await expect(header.megaMenu).toBeHidden();
        });
      }

      await header.hoverNav('Nam');
      await expectHref(header.megaLink('Bóng rổ'), '/w/bong-ro?gioiTinh=nam');
      await page.keyboard.press('Escape');
      await expect(header.megaMenu).toBeHidden();

      await header.hoverNav('Giảm giá');
      await expectHref(header.megaLink('Dưới 1.000.000 ₫'), '/w?giamGia=1&gia=duoi-1tr');
    }
  );

  test(
    'TC-15 điều hướng từ menu, không ra 404',
    { tag: '@regression' },
    async ({ page, homePage }) => {
      const { header } = homePage;
      await homePage.goto();

      await header.navLink('Nam').click();
      await expect(page).toHaveURL(/\/w\?/);
      expect(currentUrl(page).pathname).toBe('/w');
      expect(currentUrl(page).searchParams.get('gioiTinh')).toBe('nam');
      await expect(page.getByText(NOT_FOUND)).toHaveCount(0);
      await expect(header.root).toBeVisible();
      await expect(homePage.footer.root).toBeVisible();

      await homePage.goto();
      await expect(homePage.categoryTiles.first()).toBeVisible();
      await header.hoverNav('Nữ');
      await header.megaLink('Chạy bộ').click();
      await expect(page).toHaveURL(/\/w\/chay-bo/);
      expect(currentUrl(page).pathname).toBe('/w/chay-bo');
      expect(currentUrl(page).searchParams.get('gioiTinh')).toBe('nu');
      await expect(header.megaMenu).toBeHidden();
      await expect(page.getByText(NOT_FOUND)).toHaveCount(0);
      await expect(header.root).toBeVisible();
      await expect(homePage.footer.root).toBeVisible();
    }
  );

  test('TC-16 header ẩn / hiện khi cuộn', { tag: '@regression' }, async ({ homePage }) => {
    const { header } = homePage;
    await homePage.goto();
    await expect(homePage.newArrivalCards.first()).toBeVisible();

    await expect(header.findStoreLink).toBeInViewport();
    await expect(header.logo).toBeInViewport();

    await header.scrollTo(900);
    await expect(header.logo).not.toBeInViewport();

    await header.scrollTo(700);
    await expect(header.logo).toBeInViewport();
    await expect(header.findStoreLink).not.toBeInViewport();

    await header.scrollTo(0);
    await expect(header.findStoreLink).toBeInViewport();
  });

  test('TC-17 mở / đóng khung tìm kiếm', { tag: '@regression' }, async ({ page, homePage }) => {
    const { header } = homePage;
    await homePage.goto();

    const search = await header.openSearch();
    await expect(search.input).toBeFocused();
    await expect(search.popularHeading).toBeVisible();
    for (const text of nav.popularSearches) {
      await expectHref(search.popularPill(text), withScope('/w', { q: text }));
    }
    await page.keyboard.press('Escape');
    await expect(search.root).toBeHidden();
    await expect(header.searchButton).toBeFocused();

    await header.openSearch();
    await search.cancelButton.click();
    await expect(search.root).toBeHidden();

    await header.openSearch();
    await search.clickBackdrop();
    await expect(search.root).toBeHidden();

    await header.openSearch();
    await search.type('abc');
    await page.keyboard.press('Escape');
    await expect(search.root).toBeHidden();
    await header.openSearch();
    await expect(search.input).toHaveValue('');
  });

  test(
    'TC-24 "Tham gia" / "Tham gia ngay" mở đăng ký',
    { tag: '@regression' },
    async ({ homePage }) => {
      const { header, registerDialog } = homePage;
      await homePage.goto();

      await header.registerButton.click();
      await expect(registerDialog.nameInput).toBeVisible();
      await expect(registerDialog.submitButton).toBeVisible();
      await homePage.page.keyboard.press('Escape');
      await expect(registerDialog.root).toBeHidden();

      await header.joinNowButton.click();
      await expect(registerDialog.nameInput).toBeVisible();
      await expect(registerDialog.submitButton).toBeVisible();
    }
  );

  test('TC-26 khả năng truy cập cơ bản', { tag: '@regression' }, async ({ page, homePage }) => {
    for (const path of ['/', '/thong-tin/giao-hang']) {
      await test.step(`axe ${path}`, async () => {
        await homePage.goto(path);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        const { violations } = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze();
        const serious = violations
          .filter((v) => v.impact === 'serious' || v.impact === 'critical')
          .map((v) => `${v.id}: ${v.help} (${v.nodes.length})`);
        expect(serious).toEqual([]);
      });
    }

    await homePage.goto();
    await expect(homePage.heroHeading).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(homePage.header.skipLink).toBeFocused();
    await expect(homePage.header.skipLink).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.locator('#shop-main:focus, #shop-main :focus')).toHaveCount(1);
  });
});

test.describe('Khung tìm kiếm', () => {
  test('TC-18 gợi ý khi gõ', { tag: '@smoke' }, async ({ page, homePage }, testInfo) => {
    const expected = expectedSuggest('jordan');
    // Chậm API một chút để thấy trạng thái đang tải ổn định
    await page.route(API.suggest, async (route) => {
      await new Promise((r) => setTimeout(r, 800));
      await route.continue();
    });
    await homePage.goto();
    const search = await homePage.header.openSearch();

    await search.type('jordan');
    await expect(search.results).toHaveAttribute('aria-busy', 'true');
    await expect(search.suggestions).toHaveCount(expected.items.length);
    await expect(search.results).not.toHaveAttribute('aria-busy', 'true');
    await expect(search.suggestionsHeading).toBeVisible();
    for (const [i, product] of expected.items.entries()) {
      await expect(search.suggestion(i).name).toHaveText(product.name);
    }
    const first = search.suggestion(0);
    await expect(first.name).toHaveText("Air Jordan 1 Low SE 'Magic Ball'");
    await expect(first.price).toHaveText('3.669.000 ₫');
    await expect(search.viewAllLink).toHaveText(`Xem tất cả ${expected.total} kết quả`);
    await expectHref(search.viewAllLink, '/w?q=jordan');
    await docShot(page, testInfo, '03-tim-kiem');

    await first.root.click();
    await expect(page).toHaveURL(/\/t\/air-jordan-1-low-se-magic-ball$/);
    await expect(search.root).toBeHidden();
  });

  test('TC-19 Enter / pill điều hướng', { tag: '@regression' }, async ({ page, homePage }) => {
    const { header } = homePage;
    await homePage.goto();

    const search = await header.openSearch();
    await search.type('  air force 1  ');
    await search.submit();
    await expect(page).toHaveURL(/\/w\?/);
    expect(currentUrl(page).pathname).toBe('/w');
    expect(currentUrl(page).searchParams.get('q')).toBe('air force 1');
    await expect(search.root).toBeHidden();

    await header.openSearch();
    const before = page.url();
    await search.submit();
    await expect(search.root).toBeVisible();
    expect(page.url()).toBe(before);
    await search.type('   ');
    await search.submit();
    await expect(search.root).toBeVisible();
    expect(page.url()).toBe(before);

    await search.popularPill('giày bóng rổ').click();
    await expect(search.root).toBeHidden();
    await expect.poll(() => currentUrl(page).searchParams.get('q')).toBe('giày bóng rổ');
    expect(currentUrl(page).pathname).toBe('/w');
  });

  test(
    'TC-20 không có kết quả / sản phẩm ẩn / giá giảm',
    { tag: '@regression' },
    async ({ homePage }) => {
      await homePage.goto();
      const search = await homePage.header.openSearch();

      for (const q of ['xyzabc', 'air max plus']) {
        await test.step(q, async () => {
          expect(expectedSuggest(q).total).toBe(0);
          await search.type(q);
          await expect(search.noResultMessage(q)).toBeVisible();
          await expect(search.popularHeading).toBeVisible();
          await expect(search.suggestions).toHaveCount(0);
        });
      }

      await search.type('mule');
      await expect(search.suggestions).toHaveCount(1);
      const card = search.suggestion(0);
      await expect(card.badge).toHaveText('Giảm giá');
      await expect(card.price).toHaveText('3.759.000 ₫');
      await expect(card.originalPrice).toHaveText('4.699.000 ₫');
    }
  );

  test('TC-21 gợi ý lỗi (network mocking)', { tag: '@regression' }, async ({ page, homePage }) => {
    await page.route(API.suggest, fail500);
    await homePage.goto();
    const search = await homePage.header.openSearch();

    await search.type('jordan');
    await expect(search.errorMessage).toBeVisible();
    await search.submit();
    await expect(page).toHaveURL(/\/w\?/);
    expect(currentUrl(page).pathname).toBe('/w');
    expect(currentUrl(page).searchParams.get('q')).toBe('jordan');
  });
});

test.describe('Footer và trang thông tin', () => {
  test(
    'TC-22 footer + 15 trang thông tin (data-driven)',
    { tag: '@regression' },
    async ({ page, homePage, infoPage, notFoundPage }, testInfo) => {
      test.skip(testInfo.project.name === MOBILE, 'Footer desktop (mobile: TC-29)');
      const { footer } = homePage;
      await homePage.goto();

      for (const group of nav.footerGroups) {
        await expect(footer.groupHeading(group)).toBeVisible();
      }
      await expect(footer.country).toBeVisible();
      await expect(footer.copyright).toBeVisible();
      expect(nav.infoPages).toHaveLength(15);
      for (const info of nav.infoPages) {
        await expectHref(footer.link(info.label), `/thong-tin/${info.slug}`);
      }

      for (const info of nav.infoPages) {
        await test.step(info.slug, async () => {
          await infoPage.open(info.slug);
          await expect(infoPage.heading).toHaveText(info.label);
          await expect(page.getByText(NOT_FOUND)).toHaveCount(0);
        });
      }

      await infoPage.open('giao-hang');
      await expect(infoPage.main).toContainText('30.000 ₫');
      await expect(infoPage.main).toContainText('5.000.000 ₫');
      await docShot(page, testInfo, '04-trang-thong-tin');
      await infoPage.open('ve-nike');
      await expect(infoPage.main).toContainText('dự án học tập');

      await notFoundPage.goto('/thong-tin/khong-co');
      await expect(notFoundPage.message).toBeVisible();
    }
  );

  test('TC-25 trang tạm không 404', { tag: '@regression' }, async ({ page, homePage }) => {
    const errors = collectPageErrors(page);
    for (const path of [
      '/w',
      '/w/lifestyle',
      '/t/nike-dunk-low-retro',
      '/yeu-thich',
      '/gio-hang',
    ]) {
      await test.step(path, async () => {
        await homePage.goto(path);
        await expect(homePage.header.root).toBeVisible();
        await expect(homePage.footer.root).toBeVisible();
        await expect(page.getByText(NOT_FOUND)).toHaveCount(0);
      });
    }
    expect(errors).toEqual([]);
  });
});

test.describe('Tài khoản ở header (khách)', () => {
  test(
    'TC-23a đăng nhập qua hộp thoại, menu tài khoản khách',
    { tag: '@regression' },
    async ({ homePage }) => {
      const { header, loginDialog } = homePage;
      await homePage.goto();

      await header.openLogin();
      await loginDialog.login(accounts.customer);
      await expect(loginDialog.root).toBeHidden();

      const account = header.accountButton('Khách Miễn Phí');
      await expect(account).toBeVisible();
      await expect(header.registerButton).toBeHidden();
      await expect(header.loginButton).toHaveCount(0);
      await expect(header.joinNowButton).toHaveCount(0);

      await account.click();
      await expect(
        header.accountMenu.getByText(accounts.customer.email, { exact: true })
      ).toBeVisible();
      await expect(header.menuItem('Đăng xuất')).toBeVisible();
      await expect(header.accountMenu.getByText('Trang quản trị')).toHaveCount(0);
    }
  );
});

test.describe('Tài khoản ở header (quản trị)', () => {
  test.use({ storageState: storageStateOf('admin') });

  test(
    'TC-23b quản trị thấy "Trang quản trị"',
    { tag: '@regression' },
    async ({ page, homePage }) => {
      const { header } = homePage;
      await homePage.goto();

      await header.accountButton('Administrator').click();
      await header.menuItem('Trang quản trị').click();
      await expect(page).toHaveURL(/\/admin$/);
    }
  );
});

test.describe('Khung cửa hàng mobile', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== MOBILE, 'Chỉ chạy ở mobile-chrome');
  });

  test(
    'TC-27 header + trang chủ mobile',
    { tag: '@smoke' },
    async ({ page, homePage }, testInfo) => {
      const { header } = homePage;
      await homePage.goto();

      await expect(header.findStoreLink).toBeHidden();
      await expect(header.navLink('Nam')).toBeHidden();
      await expect(header.searchButton).toBeVisible();
      await expect(header.loginButton).toBeVisible();
      await expect(header.menuButton).toBeVisible();
      await expect(header.cartLink).toBeVisible();
      await expect(homePage.newArrivalCards).toHaveCount(expectedNewArrivals().length);
      await expect(homePage.categoryTiles).toHaveCount(
        expectedCategories().filter((c) => c.productCount > 0).length
      );
      await docShot(page, testInfo, '05-trang-chu-mobile');

      await header.openLogin();
      await expect(homePage.loginDialog.root).toBeVisible();
    }
  );

  test('TC-28 menu trượt mobile', { tag: '@regression' }, async ({ page, homePage }) => {
    const { header, registerDialog } = homePage;
    await homePage.goto();

    const menu = await header.openMobileMenu();
    for (const item of nav.navItems) await expect(menu.item(item.label)).toBeVisible();
    await expect(menu.jordanLink).toBeVisible();
    await expectHref(menu.jordanLink, '/w/jordan');

    await menu.item('Nam').click();
    await expect(menu.panelHeading('Nam')).toBeVisible();
    await expectHref(menu.link('Xem tất cả'), '/w?gioiTinh=nam');
    await expectHref(menu.link('Bóng rổ'), '/w/bong-ro?gioiTinh=nam');
    await expectHref(menu.link('Từ 5.000.000 ₫'), '/w?gioiTinh=nam&gia=tu-5tr');
    await menu.backButton.click();
    await expect(menu.panelHeading('Nam')).toBeHidden();
    await expect(menu.item('Nam')).toBeVisible();

    await menu.joinButton.click();
    await expect(menu.root).toBeHidden();
    await expect(registerDialog.nameInput).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(registerDialog.root).toBeHidden();

    await header.openMobileMenu();
    await menu.link('Trợ giúp').click();
    await expect(page).toHaveURL(/\/thong-tin\/tro-giup$/);
    await expect(menu.root).toBeHidden();

    await header.openMobileMenu();
    await menu.closeButton.click();
    await expect(menu.root).toBeHidden();
  });

  test('TC-29 footer accordion mobile', { tag: '@regression' }, async ({ homePage }) => {
    const { footer } = homePage;
    await homePage.goto();

    const toggle = footer.groupToggle('Trợ giúp');
    await toggle.scrollIntoViewIfNeeded();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(footer.link('Giao hàng')).toBeHidden();

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(footer.link('Giao hàng')).toBeVisible();

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(footer.link('Giao hàng')).toBeHidden();
  });

  test('TC-30 tìm kiếm mobile', { tag: '@regression' }, async ({ page, homePage }) => {
    const expected = expectedSuggest('dép');
    await homePage.goto();

    const search = await homePage.header.openSearch();
    const box = await search.root.boundingBox();
    const viewport = page.viewportSize();
    expect(box && viewport).toBeTruthy();
    expect(Math.round(box?.width ?? 0)).toBeGreaterThanOrEqual((viewport?.width ?? 0) - 1);
    expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual((viewport?.height ?? 0) - 1);

    await search.type('dép');
    await expect(search.suggestions).toHaveCount(expected.items.length);
    for (const [i, product] of expected.items.entries()) {
      await expect(search.suggestion(i).name).toHaveText(product.name);
    }
    await search.submit();
    await expect(page).toHaveURL(/\/w\?/);
    expect(currentUrl(page).pathname).toBe('/w');
    expect(currentUrl(page).searchParams.get('q')).toBe('dép');
  });
});
