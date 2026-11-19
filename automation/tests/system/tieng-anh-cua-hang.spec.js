import { accountNames, accounts } from '../../data/accounts.js';
import nav from '../../data/nav-links.json' with { type: 'json' };
import shopRoutes from '../../data/shop-routes.json' with { type: 'json' };
import {
  catalogTitle,
  expectedList,
  expectedSuggest,
  seedCategories,
} from '../../data/seed-products.js';
import { expect, test } from '../../fixtures/index.js';
import { docShot } from '../../utils/doc-shot.js';
import { uniqueEmail } from '../../utils/unique.js';
import { scanVietnamese } from '../../utils/vietnamese.js';

/**
 * Lát `tieng-anh-cua-hang` (plan/tieng-anh-cua-hang.md §6.1 → §6.8, §9 TC-10 → TC-17): khu cửa hàng
 * tiếng Anh — quét chữ có dấu trên mọi trang / lớp phủ, URL + khoá query mới, thông báo lỗi tiếng Anh.
 */

const NOT_FOUND = "We can't find the page you're looking for.";

/**
 * h1 trang danh sách mong đợi cho một href `/w…` (lát danh-sach-giay §6.1 thay trang tạm "Coming Soon"):
 * `<tiêu đề> (<total>)`, tính từ products.json.
 * @param {string} href
 */
function catalogHeadingOf(href) {
  const url = new URL(href, 'http://x');
  const slug = url.pathname.split('/')[2];
  /** @type {Record<string, string>} */
  const search = Object.fromEntries(url.searchParams.entries());
  const name = seedCategories.find((c) => c.slug === slug)?.name ?? null;
  const total = expectedList(slug ? { ...search, category: slug } : search).total;
  return `${catalogTitle(search, name)} (${total})`;
}
const CHROMIUM = 'chromium';

/**
 * Khẳng định không còn chữ có dấu tiếng Việt trong `root`; lỗi kèm nơi quét + đoạn vi phạm.
 * @param {import('@playwright/test').Locator} root
 * @param {string} where
 */
async function expectNoVietnamese(root, where) {
  const hits = await scanVietnamese(root);
  expect(hits, `${where} còn chữ tiếng Việt:\n${hits.join('\n')}`).toEqual([]);
}

/** Ghi lại lỗi JS và lỗi console của trang. @param {import('@playwright/test').Page} page */
function collectErrors(page) {
  /** @type {string[]} */
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

/**
 * So URL hiện tại với `expected` theo path + từng tham số (không phụ thuộc thứ tự / mã hoá dấu phẩy).
 * @param {import('@playwright/test').Page} page
 * @param {string} expected
 */
function expectUrl(page, expected) {
  const a = new URL(page.url());
  const e = new URL(expected, 'http://x');
  expect(a.pathname, `path của ${page.url()}`).toBe(e.pathname);
  const sorted = (/** @type {URL} */ u) => [...u.searchParams.entries()].sort();
  expect(sorted(a), `tham số của ${page.url()}`).toEqual(sorted(e));
}

test.describe('Cửa hàng tiếng Anh: quét chữ mọi trang', () => {
  for (const route of shopRoutes.routes) {
    test(
      `TC-10 không còn chữ tiếng Việt: ${route.name} (${route.path})`,
      { tag: '@regression' },
      async ({ page, homePage }) => {
        await homePage.goto(route.path);
        // 404 ở gốc dùng trang 404 chung, không có khung cửa hàng (plan giao-dien-nike §6.7) → chỉ chờ h1
        if (route.name !== '404') await expect(homePage.header.root).toBeVisible();
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
        if (route.path === '/') await expect(homePage.newArrivalCards.first()).toBeVisible();

        await expect(page.locator('html')).toHaveAttribute('lang', 'en');
        await expectNoVietnamese(page.locator('body'), route.path);
      }
    );
  }
});

test.describe('Cửa hàng tiếng Anh: lớp phủ và hộp thoại', () => {
  test(
    'TC-11 quét chữ trong lớp phủ / hộp thoại',
    { tag: '@regression' },
    async ({ homePage, signInPage }) => {
      const { header } = homePage;
      await homePage.goto();
      await expect(homePage.categoryTiles.first()).toBeVisible();

      await test.step('mega menu "Men" / menu trượt + panel "Men"', async () => {
        if (header.isDesktop()) {
          await header.hoverNav('Men');
          await expectNoVietnamese(header.megaMenu, 'mega menu Men');
          await homePage.heroHeading.hover();
          await expect(header.megaMenu).toBeHidden();
        } else {
          const menu = await header.openMobileMenu();
          await expectNoVietnamese(menu.root, 'menu trượt');
          await menu.item('Men').click();
          await expect(menu.panelHeading('Men')).toBeVisible();
          await expectNoVietnamese(menu.root, 'menu trượt panel Men');
          await menu.closeButton.click();
          await expect(menu.root).toBeHidden();
        }
      });

      await test.step('khung tìm kiếm: rỗng, có gợi ý, không kết quả', async () => {
        const search = await header.openSearch();
        await expect(search.popularHeading).toBeVisible();
        await expectNoVietnamese(search.root, 'tìm kiếm rỗng');

        await search.type('basketball shoes');
        await expect(search.suggestions).toHaveCount(
          expectedSuggest('basketball shoes').items.length
        );
        await expectNoVietnamese(search.root, 'tìm kiếm có gợi ý');

        await search.type('zzzz');
        await expect(search.noResultMessage('zzzz')).toBeVisible();
        await expectNoVietnamese(search.root, 'tìm kiếm không kết quả');
        await search.cancelButton.click();
        await expect(search.root).toBeHidden();
      });

      // Lát dang-nhap-nike: hộp thoại Sign In / Join Us thay bằng 3 bước của trang /signin
      await test.step('/signin bước email (kể cả lỗi validate)', async () => {
        await header.openLogin();
        await signInPage.expectStep('email');
        await expectNoVietnamese(signInPage.main, '/signin bước email');
        await signInPage.continueButton.click();
        await expect(signInPage.fieldError('Please enter your email.')).toBeVisible();
        await expectNoVietnamese(signInPage.main, '/signin bước email lỗi validate');
      });

      await test.step('/signin bước mật khẩu (lỗi validate)', async () => {
        await signInPage.submitEmail(accounts.customer.email);
        await signInPage.expectStep('password');
        await signInPage.signInButton.click();
        await expect(signInPage.fieldError('Please enter your password.')).toBeVisible();
        await expectNoVietnamese(signInPage.main, '/signin bước mật khẩu lỗi validate');
      });

      await test.step('/signin bước tạo tài khoản (lỗi validate)', async () => {
        await signInPage.editButton.click();
        await signInPage.submitEmail(uniqueEmail());
        await signInPage.expectStep('join');
        await signInPage.createAccountButton.click();
        await expect(signInPage.fieldError('Please enter your full name.')).toBeVisible();
        await expectNoVietnamese(signInPage.main, '/signin bước tạo tài khoản lỗi validate');
      });
    }
  );
});

test.describe('Cửa hàng tiếng Anh: luồng chính (chromium)', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== CHROMIUM, 'Chỉ chạy ở chromium (plan §9)');
  });

  test(
    'TC-12 quét chữ khi đã đăng nhập',
    { tag: '@smoke' },
    async ({ page, homePage, signInPage }, testInfo) => {
      const { header } = homePage;
      const name = accountNames.customer;
      await homePage.goto();
      await header.openLogin();
      await signInPage.signIn(accounts.customer);
      await expect(page).toHaveURL(/\/$/);
      await expect(homePage.toast(`Welcome back, ${name}!`)).toBeVisible();

      const account = header.accountButton(name);
      await expect(account).toBeVisible();
      await expectNoVietnamese(page.locator('body'), '/ đã đăng nhập');

      await account.click();
      await expect(header.menuItem('Sign Out')).toBeVisible();
      await expect(header.menuItem('Admin')).toHaveCount(0);
      await expectNoVietnamese(header.accountMenu, 'menu tài khoản');
      await docShot(page, testInfo, '01-menu-tai-khoan');
    }
  );

  for (const click of nav.menuClicks) {
    test(
      `TC-13 URL mới từ menu: ${click.nav}${click.link ? ` → ${click.link}` : ''}`,
      { tag: '@regression' },
      async ({ page, homePage }) => {
        const { header } = homePage;
        await homePage.goto();
        await expect(homePage.categoryTiles.first()).toBeVisible();

        if (click.link) {
          await header.hoverNav(click.nav);
          await header.megaLink(click.link).click();
        } else {
          await header.navLink(click.nav).click();
        }
        await expect(page).toHaveURL(/\/w(\/|\?|$)/);
        expectUrl(page, click.href);
        // Lát danh-sach-giay: trang tạm được thay bằng danh sách thật → h1 = tiêu đề + số lượng
        await expect(page.getByTestId('catalog-title')).toHaveText(catalogHeadingOf(click.href));
        await expect(page.getByText(NOT_FOUND)).toHaveCount(0);
      }
    );
  }

  test(
    'TC-14 URL tiếng Việt cũ không còn',
    { tag: '@regression' },
    async ({ page, notFoundPage }) => {
      for (const path of ['/thong-tin/giao-hang', '/gio-hang', '/yeu-thich']) {
        await test.step(path, async () => {
          await notFoundPage.goto(path);
          await expect(notFoundPage.message).toBeVisible();
        });
      }

      const errors = collectErrors(page);
      await notFoundPage.goto('/w?gioiTinh=nam&sapXep=moi-nhat');
      // Lát danh-sach-giay: khoá cũ bị bỏ qua → danh sách mặc định
      await expect(page.getByTestId('catalog-title')).toHaveText('Shoes (30)');
      await expect(notFoundPage.message).toHaveCount(0);
      expect(errors).toEqual([]);
    }
  );

  test(
    'TC-15 đăng nhập: lỗi client + lỗi server tiếng Anh',
    { tag: '@regression' },
    async ({ page, homePage, signInPage }, testInfo) => {
      // Lát dang-nhap-nike: lỗi email ở bước email, lỗi mật khẩu ở bước mật khẩu của /signin
      const { header } = homePage;
      await homePage.goto();
      await header.openLogin();

      await signInPage.continueButton.click();
      await expect(signInPage.fieldError('Please enter your email.')).toBeVisible();

      await signInPage.submitEmail(accounts.customer.email);
      await signInPage.expectStep('password');
      await signInPage.signInButton.click();
      await expect(signInPage.fieldError('Please enter your password.')).toBeVisible();

      await signInPage.passwordInput.fill('SaiMatKhau1');
      await signInPage.signInButton.click();
      await expect(signInPage.alert).toHaveText('Incorrect email or password.');
      await signInPage.expectStep('password');
      await docShot(page, testInfo, '02-dang-nhap-sai');
    }
  );

  test(
    'TC-16 đăng ký: validate + email trùng',
    { tag: '@regression' },
    async ({ page, api, homePage, signInPage }, testInfo) => {
      // Lát dang-nhap-nike: email sai định dạng báo ở bước email; email trùng chỉ xảy ra khi email vừa được
      // đăng ký ở nơi khác giữa bước email và lúc tạo tài khoản (đăng ký qua API để tái hiện)
      const { header } = homePage;
      const email = uniqueEmail();
      await homePage.goto();
      await header.openRegister();

      await signInPage.submitEmail('abc');
      await expect(signInPage.fieldError('Please enter a valid email address.')).toBeVisible();

      await signInPage.submitEmail(email);
      await signInPage.expectStep('join');
      await signInPage.fillJoin({ name: '', password: 'abcdefgh', terms: false });
      await signInPage.createAccountButton.click();
      for (const message of [
        'Please enter your full name.',
        'Password must contain a number.',
        'You must agree to the terms to continue.',
      ]) {
        await expect(signInPage.fieldError(message)).toBeVisible();
      }
      await docShot(page, testInfo, '03-dang-ky-loi');

      await api.client.expectOk(
        await api.account.register({ name: 'Other Tab', email, plainPassword: 'Abc@12345' })
      );
      await signInPage.fillJoin({ name: 'Test User', password: 'Abc@12345' });
      await signInPage.createAccountButton.click();
      await expect(signInPage.alert).toContainText('This email is already registered.');
      await expect(signInPage.signInWithEmailButton).toBeVisible();

      await signInPage.signInWithEmailButton.click();
      await signInPage.expectStep('password');
      await expect(signInPage.emailLine(email)).toBeVisible();
    }
  );

  test(
    'TC-17 trang thông tin + footer tiếng Anh',
    { tag: '@regression' },
    async ({ page, homePage, infoPage }, testInfo) => {
      await homePage.goto();
      await homePage.footer.link('Delivery').click();
      await expect(page).toHaveURL(/\/info\/delivery$/);
      await expect(infoPage.heading).toHaveText('Delivery');
      await expect(infoPage.main).toContainText(
        'Delivery costs 30.000 ₫ per order. Orders with a subtotal of 5.000.000 ₫ or more ship free.'
      );
      await docShot(page, testInfo, '04-trang-thong-tin');

      await infoPage.open('help');
      await expect(infoPage.heading).toHaveText('Get Help');
      for (const name of ['Delivery', 'Returns', 'Payment Options', 'Contact Us']) {
        await expect(infoPage.main.getByRole('link', { name, exact: true })).toBeVisible();
      }
      await expect(page).toHaveTitle('Get Help | Nike');
    }
  );
});
