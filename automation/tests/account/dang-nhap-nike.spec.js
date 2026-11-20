/* global document, window, MutationObserver -- dùng trong page.evaluate / addInitScript (chạy ở trình duyệt) */
import { createApi } from '../../api/index.js';
import { accountNames, accounts, WRONG_PASSWORD } from '../../data/accounts.js';
import joinInvalid from '../../data/join-invalid.json' with { type: 'json' };
import signinRedirect from '../../data/signin-redirect.json' with { type: 'json' };
import { expect, test } from '../../fixtures/index.js';
import { HeaderComponent } from '../../pages/components/HeaderComponent.js';
import { SIGN_IN_HEADINGS } from '../../pages/SignInPage.js';
import { docShot } from '../../utils/doc-shot.js';
import { uniqueEmail } from '../../utils/unique.js';

/**
 * Lát `dang-nhap-nike` (plan/dang-nhap-nike.md §5.2, §6, §9 TC-07 → TC-20): trang `/signin` nhập email trước,
 * bước mật khẩu / tạo tài khoản, `?redirect=` chặn open redirect, mọi lối vào "Sign In" / "Join Us" là link.
 * Nhóm desktop bỏ qua ở `mobile-chrome`; TC-19 chỉ chạy ở `mobile-chrome`.
 */

const MOBILE = 'mobile-chrome';
const KHACH1 = accounts.khach1;
const KHACH1_NAME = accountNames.khach1;
const JOIN_PASSWORD = 'Abc12345';
const SIGNIN_FROM_HOME = '/signin?redirect=%2F';

const API = {
  checkEmail: '/api/account/public/check-email',
  authenticate: '/api/user/authenticate',
  register: '/api/account/register',
};

/**
 * Đếm request POST tới `path` kể từ lúc gọi.
 * @param {import('@playwright/test').Page} page
 * @param {string} path
 */
function countRequests(page, path) {
  const counter = { count: 0 };
  page.on('request', (req) => {
    if (req.method() === 'POST' && new URL(req.url()).pathname.endsWith(path)) counter.count += 1;
  });
  return counter;
}

/**
 * Đường dẫn + query hiện tại, khẳng định cùng origin với trang.
 * @param {import('@playwright/test').Page} page
 * @param {string} baseURL
 */
function currentPath(page, baseURL) {
  const url = new URL(page.url());
  expect(url.origin).toBe(new URL(baseURL).origin);
  return `${url.pathname}${url.search}`;
}

/**
 * Gắn phiên đăng nhập sẵn vào trình duyệt (cùng định dạng store `auth-storage` của FE).
 * @param {import('@playwright/test').Page} page
 * @param {{ token: string, refreshToken: string, userId: number }} login
 */
async function seedSession(page, login) {
  const state = JSON.stringify({
    state: {
      accessToken: login.token,
      refreshToken: login.refreshToken,
      userId: login.userId,
      remember: true,
    },
    version: 0,
  });
  await page.addInitScript((value) => localStorage.setItem('auth-storage', value), state);
}

/** Access token đang lưu trong trang (localStorage hoặc sessionStorage). @param {import('@playwright/test').Page} page */
function pageToken(page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('auth-storage') ?? sessionStorage.getItem('auth-storage');
    return raw ? JSON.parse(raw).state.accessToken : null;
  });
}

test.describe('Trang /signin (desktop)', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === MOBILE, 'Nhóm desktop (mobile: TC-19)');
  });

  test(
    'TC-07 bước email hiển thị đúng',
    { tag: '@regression' },
    async ({ page, signInPage }, testInfo) => {
      await signInPage.goto();

      await expect(page).toHaveTitle('Sign In | Nike');
      await signInPage.expectStep('email');
      await expect(signInPage.country).toBeVisible();
      await expect(signInPage.emailInput).toBeFocused();
      await expect(signInPage.privacyLink).toHaveAttribute('href', '/info/privacy-policy');
      await expect(signInPage.termsLink).toHaveAttribute('href', '/info/terms-of-use');
      await expect(signInPage.continueButton).toBeVisible();
      await expect(signInPage.homeLink).toHaveAttribute('href', '/');
      await expect(page.getByRole('link', { name: 'Men', exact: true })).toHaveCount(0);
      await expect(page.getByRole('contentinfo')).toHaveCount(0);
      await docShot(page, testInfo, '01-buoc-email');
    }
  );

  test('TC-08 validate email phía client', { tag: '@regression' }, async ({ page, signInPage }) => {
    await signInPage.goto();
    const calls = countRequests(page, API.checkEmail);

    await signInPage.continueButton.click();
    await expect(signInPage.fieldError('Please enter your email.')).toBeVisible();

    await signInPage.submitEmail('abc');
    await expect(signInPage.fieldError('Please enter a valid email address.')).toBeVisible();

    await signInPage.expectStep('email');
    expect(calls.count).toBe(0);
  });

  test(
    'TC-09 đăng nhập: sai rồi đúng mật khẩu',
    { tag: '@smoke' },
    async ({ page, signInPage }, testInfo) => {
      const header = new HeaderComponent(page);
      await signInPage.goto();

      await signInPage.emailInput.fill(KHACH1.email);
      await signInPage.emailInput.press('Enter');
      await signInPage.expectStep('password');
      await expect(signInPage.emailLine(KHACH1.email)).toBeVisible();
      await expect(signInPage.editButton).toBeVisible();
      await expect(signInPage.passwordInput).toBeFocused();
      await docShot(page, testInfo, '02-buoc-mat-khau');

      await signInPage.passwordInput.fill(WRONG_PASSWORD);
      await signInPage.signInButton.click();
      await expect(signInPage.alert).toHaveText('Incorrect email or password.');
      await expect(signInPage.passwordInput).toHaveValue('');
      await expect(signInPage.passwordInput).toBeFocused();
      await signInPage.expectStep('password');

      await signInPage.passwordInput.fill(KHACH1.password);
      await signInPage.passwordInput.press('Enter');
      await expect(page).toHaveURL(/\/$/);
      await expect(signInPage.toast(`Welcome back, ${KHACH1_NAME}!`)).toBeVisible();
      await expect(header.accountButton(KHACH1_NAME)).toBeVisible();
    }
  );

  test(
    'TC-10 bước mật khẩu: trống + hiện / ẩn',
    { tag: '@regression' },
    async ({ page, signInPage }) => {
      await signInPage.goto();
      await signInPage.submitEmail(KHACH1.email);
      await signInPage.expectStep('password');
      const calls = countRequests(page, API.authenticate);

      await signInPage.signInButton.click();
      await expect(signInPage.fieldError('Please enter your password.')).toBeVisible();
      expect(calls.count).toBe(0);

      await signInPage.passwordInput.fill(KHACH1.password);
      await expect(signInPage.passwordInput).toHaveAttribute('type', 'password');
      await page.getByRole('button', { name: 'Show password', exact: true }).click();
      await expect(signInPage.passwordInput).toHaveAttribute('type', 'text');
      await page.getByRole('button', { name: 'Hide password', exact: true }).click();
      await expect(signInPage.passwordInput).toHaveAttribute('type', 'password');
    }
  );

  test('TC-11 "Edit" quay về bước email', { tag: '@regression' }, async ({ signInPage }) => {
    const email = uniqueEmail();
    await signInPage.goto();
    await signInPage.submitEmail(KHACH1.email);
    await signInPage.expectStep('password');

    await signInPage.editButton.click();
    await signInPage.expectStep('email');
    await expect(signInPage.emailInput).toHaveValue(KHACH1.email);

    await signInPage.submitEmail(email);
    await signInPage.expectStep('join');
    await expect(signInPage.emailLine(email)).toBeVisible();
  });

  test(
    'TC-12 tạo tài khoản thành công',
    { tag: '@smoke' },
    async ({ page, request, signInPage }, testInfo) => {
      const header = new HeaderComponent(page);
      const email = uniqueEmail();
      await signInPage.goto();

      await signInPage.submitEmail(email);
      await signInPage.expectStep('join');
      await expect(signInPage.nameInput).toBeFocused();
      await expect(
        signInPage.main.getByText('At least 8 characters, with letters and numbers', {
          exact: true,
        })
      ).toBeVisible();
      await signInPage.fillJoin({ name: 'Join Test', password: JOIN_PASSWORD });
      await docShot(page, testInfo, '03-buoc-tao-tai-khoan');
      await signInPage.createAccountButton.click();

      await expect(page).toHaveURL(/\/$/);
      await expect(signInPage.toast('Account created. Welcome, Join Test!')).toBeVisible();
      await expect(header.accountButton('Join Test')).toBeVisible();

      const token = await pageToken(page);
      expect(token).toBeTruthy();
      const api = createApi(request, token);
      const me = await api.client.expectOk(await api.account.me());
      expect(me.email).toBe(email);
    }
  );

  for (const c of joinInvalid) {
    test(
      `TC-13${c.id} validate tạo tài khoản: ${c.case}`,
      { tag: '@regression' },
      async ({ page, signInPage }) => {
        await signInPage.goto();
        await signInPage.submitEmail(uniqueEmail());
        await signInPage.expectStep('join');
        const calls = countRequests(page, API.register);

        await signInPage.fillJoin({ name: c.name, password: c.password, terms: c.terms });
        await signInPage.createAccountButton.click();

        for (const message of c.errors) {
          await expect(signInPage.fieldError(message)).toBeVisible();
        }
        await signInPage.expectStep('join');
        expect(calls.count).toBe(0);
      }
    );
  }

  test(
    'TC-14 email vừa bị đăng ký ở nơi khác',
    { tag: '@regression' },
    async ({ page, api, signInPage }) => {
      const email = uniqueEmail();
      await signInPage.goto();
      await signInPage.submitEmail(email);
      await signInPage.expectStep('join');

      await api.client.expectOk(
        await api.account.register({ name: 'Other Tab', email, plainPassword: JOIN_PASSWORD })
      );
      await signInPage.fillJoin({ name: 'Join Test', password: JOIN_PASSWORD });
      await signInPage.createAccountButton.click();

      await expect(signInPage.alert).toContainText('This email is already registered.');
      await expect(signInPage.signInWithEmailButton).toBeVisible();

      await signInPage.signInWithEmailButton.click();
      await signInPage.expectStep('password');
      await expect(signInPage.emailLine(email)).toBeVisible();
      await signInPage.passwordInput.fill(JOIN_PASSWORD);
      await signInPage.signInButton.click();
      await expect(page).toHaveURL(/\/$/);
    }
  );

  for (const c of signinRedirect) {
    test(
      `TC-15 chặn open redirect: ${c.redirect}`,
      { tag: '@regression' },
      async ({ page, baseURL, signInPage }) => {
        await signInPage.goto({ redirect: c.redirect });

        await signInPage.signIn(KHACH1);

        await expect(signInPage.toast(`Welcome back, ${KHACH1_NAME}!`)).toBeVisible();
        await expect.poll(() => currentPath(page, String(baseURL))).toBe(c.expected);
      }
    );
  }

  test(
    'TC-16 quay lại trang trước sau khi đăng nhập',
    { tag: '@regression' },
    async ({ page, baseURL, signInPage }) => {
      const header = new HeaderComponent(page);
      await page.goto('/w/basketball?gender=men', { waitUntil: 'load' });

      await header.loginButton.click();
      await expect
        .poll(() => currentPath(page, String(baseURL)))
        .toBe('/signin?redirect=%2Fw%2Fbasketball%3Fgender%3Dmen');

      await signInPage.signIn(KHACH1);
      await expect.poll(() => currentPath(page, String(baseURL))).toBe('/w/basketball?gender=men');
      await expect(header.accountButton(KHACH1_NAME)).toBeVisible();

      await page.goBack();
      await expect(page).not.toHaveURL(/\/signin/);
    }
  );

  test(
    'TC-17 đã đăng nhập mà vào /signin',
    { tag: '@regression' },
    async ({ page, api, baseURL, signInPage }) => {
      await seedSession(page, await api.auth.loginOk(KHACH1));
      // Ghi lại nếu h1 bước email từng xuất hiện (dù chỉ thoáng qua) trong mọi lần tải trang
      await page.addInitScript((text) => {
        new MutationObserver(() => {
          if ([...document.querySelectorAll('h1')].some((h) => h.textContent === text)) {
            sessionStorage.setItem('saw-email-step', '1');
          }
        }).observe(document, { subtree: true, childList: true, characterData: true });
      }, SIGN_IN_HEADINGS.email);

      await signInPage.goto({ redirect: '/favorites' });
      await expect.poll(() => currentPath(page, String(baseURL))).toBe('/favorites');

      // WebKit báo trễ lần router đổi URL bằng history.replaceState ở trên thành "điều hướng khác",
      // làm lệnh goto kế tiếp bị "interrupted" → mở lần hai từ trang trắng như lần một
      // (sessionStorage của origin vẫn giữ cờ). Không đổi ý nghĩa ca kiểm.
      await page.goto('about:blank');
      await signInPage.goto();
      await expect.poll(() => currentPath(page, String(baseURL))).toBe('/');

      expect(await page.evaluate(() => sessionStorage.getItem('saw-email-step'))).toBeNull();
    }
  );

  test(
    'TC-18 lối vào từ khung cửa hàng',
    { tag: '@regression' },
    async ({ page, baseURL, homePage, signInPage }) => {
      const { header } = homePage;
      await homePage.goto();

      await expect(header.registerButton).toHaveAttribute('href', SIGNIN_FROM_HOME);
      await expect(header.registerButton).toHaveText('Join Us');
      await expect(header.loginButton).toHaveAttribute('href', SIGNIN_FROM_HOME);
      await expect(header.joinNowButton).toHaveAttribute('href', SIGNIN_FROM_HOME);

      await header.registerButton.click();
      await expect.poll(() => currentPath(page, String(baseURL))).toBe(SIGNIN_FROM_HOME);
      await signInPage.expectStep('email');
      await expect(page.getByRole('dialog', { name: 'Sign In' })).toHaveCount(0);
      await expect(page.getByRole('dialog', { name: 'Become a Nike Member' })).toHaveCount(0);
    }
  );

  test('TC-20 sai quá số lần', { tag: '@regression' }, async ({ api, signInPage }) => {
    const email = uniqueEmail();
    await api.client.expectOk(
      await api.account.register({ name: 'Lock Test', email, plainPassword: JOIN_PASSWORD })
    );
    for (let i = 0; i < 10; i += 1) {
      await api.client.expectError(await api.auth.login({ email, password: WRONG_PASSWORD }), 400);
    }

    await signInPage.goto();
    await signInPage.signIn({ email, password: JOIN_PASSWORD });

    await expect(signInPage.alert).toHaveText(
      'Too many failed sign-in attempts. Please try again in a few minutes.'
    );
    await signInPage.expectStep('password');
  });
});

test.describe('Trang /signin (mobile)', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== MOBILE, 'Chỉ chạy ở mobile-chrome');
  });

  test(
    'TC-19 lối vào + bố cục mobile',
    { tag: '@smoke' },
    async ({ page, baseURL, homePage, signInPage }, testInfo) => {
      const { header } = homePage;
      await homePage.goto();

      await header.loginButton.click();
      await expect.poll(() => currentPath(page, String(baseURL))).toBe(SIGNIN_FROM_HOME);
      await signInPage.expectStep('email');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      expect(overflow).toBeLessThanOrEqual(0);
      await expect(signInPage.continueButton).toBeInViewport();
      await docShot(page, testInfo, '04-buoc-email-mobile');

      await page.goBack();
      const menu = await header.openMobileMenu();
      await menu.joinButton.click();
      await expect.poll(() => currentPath(page, String(baseURL))).toBe(SIGNIN_FROM_HOME);
      await signInPage.expectStep('email');
    }
  );
});
