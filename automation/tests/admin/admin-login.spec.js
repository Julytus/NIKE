import { accounts, WRONG_PASSWORD } from '../../data/accounts.js';
import { expect, test } from '../../fixtures/index.js';
import { docShot } from '../../utils/doc-shot.js';

test.describe('Đăng nhập trang quản trị', () => {
  test(
    'TC-12 đăng nhập đúng vào /admin',
    { tag: '@smoke' },
    async ({ page, loginPage, adminLayout }, testInfo) => {
      await loginPage.goto();
      await expect(loginPage.identifierInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.rememberMe).toBeVisible();
      await docShot(page, testInfo, '01-trang-dang-nhap');

      await loginPage.login(accounts.admin);

      await expect(page).toHaveURL(/\/admin\/?$/);
      await expect(adminLayout.greeting).toBeVisible();
      await adminLayout.openSidebar();
      await expect(adminLayout.menuItem('Chức vụ')).toBeVisible();
      await docShot(page, testInfo, '02-da-dang-nhap');
    }
  );

  test(
    'TC-13 đăng nhập sai mật khẩu ở lại /login',
    { tag: '@regression' },
    async ({ page, loginPage }, testInfo) => {
      // Chỉ chạy một trình duyệt để không cộng dồn lần sai (khoá tạm sau 10 lần) — plan §11.1
      test.skip(testInfo.project.name !== 'chromium', 'Đăng nhập sai chỉ chạy ở chromium');

      await loginPage.goto();
      await loginPage.login({ email: accounts.admin.email, password: WRONG_PASSWORD });

      await expect(loginPage.toast('Tài khoản hoặc mật khẩu không đúng.')).toBeVisible();
      await expect(page).toHaveURL(/\/login$/);
      await docShot(page, testInfo, '03-dang-nhap-sai');
    }
  );
});
