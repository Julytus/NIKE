import { accounts, storageStateOf } from '../../data/accounts.js';
import { expect, test } from '../../fixtures/index.js';
import { docShot } from '../../utils/doc-shot.js';
import { uniqueEmail } from '../../utils/unique.js';

/**
 * Lát `go-lut` (plan/go-lut.md §6, §9 TC-12 → TC-20): giao diện sau khi gỡ LUT —
 * trang chủ `/` (sửa theo lát giao-dien-nike), hộp thoại đăng ký / đăng nhập, menu tài khoản, route cũ 404, admin chỉ còn Hệ thống.
 */

// Chuỗi / URL đổi sang tiếng Anh ở lát tieng-anh-cua-hang (D6).
const SYSTEM_MENU = ['Roles', 'Permissions', 'Resources', 'Modules'];
const REMOVED_ADMIN_MENU = ['LUT', 'Color Features', 'Recommendations'];

test.describe('Cửa hàng sau khi gỡ LUT', () => {
  // TC-12 → TC-15 sửa theo lát giao-dien-nike (§7.1 bước 6): `/` là trang chủ Nike, nút "Đăng ký" đổi thành
  // "Join Us" (mobile nằm trong menu trượt), nút tài khoản đọc "Hi, <name>" (lát tieng-anh-cua-hang).
  test('TC-12 trang chủ / cho khách', { tag: '@smoke' }, async ({ page, homePage }, testInfo) => {
    await homePage.goto();

    await expect(page).toHaveTitle('Nike. Just Do It.');
    await expect(homePage.heroHeading).toBeVisible();
    await homePage.header.expectLoggedOut();
    await expect(page.locator('body')).not.toContainText('LUT');
    await docShot(page, testInfo, '01-trang-chu');
  });

  test(
    'TC-13 đăng ký không còn bước chọn phong cách',
    { tag: '@regression' },
    async ({ page, homePage, signInPage }, testInfo) => {
      // Lát dang-nhap-nike: đăng ký ở trang /signin (bước email → tạo tài khoản), không còn hộp thoại
      await homePage.goto();
      await homePage.header.openRegister();
      await signInPage.submitEmail(uniqueEmail());
      await signInPage.expectStep('join');
      await docShot(page, testInfo, '02-dang-ky');

      await signInPage.fillJoin({ name: 'Auto Test', password: 'Admin@123' });
      await signInPage.createAccountButton.click();

      await expect(page).toHaveURL(/\/$/);
      await expect(homePage.header.accountButton('Auto Test')).toBeVisible();
      await expect(page.getByText('Bạn thích phong cách màu nào?')).toHaveCount(0);
    }
  );

  test(
    'TC-14 menu tài khoản khách chỉ còn mục cơ bản',
    { tag: '@regression' },
    async ({ page, homePage, signInPage }, testInfo) => {
      const { header } = homePage;
      await homePage.goto();
      await header.openLogin();
      await signInPage.signIn(accounts.customer);
      await expect(page).toHaveURL(/\/$/);

      await header.accountButton('Free Member').click();
      await expect(header.accountMenu.getByText('Free Member', { exact: true })).toBeVisible();
      await expect(
        header.accountMenu.getByText(accounts.customer.email, { exact: true })
      ).toBeVisible();
      await expect(header.menuItem('Sign Out')).toBeVisible();
      for (const removed of [
        'My Plan',
        'Collections',
        'Color Preferences',
        'Clear Recommendation History',
        'Admin',
      ]) {
        await expect(header.accountMenu.getByText(removed)).toHaveCount(0);
      }
      await docShot(page, testInfo, '03-menu-tai-khoan');
    }
  );

  test('TC-15 đăng xuất', { tag: '@regression' }, async ({ homePage, signInPage }) => {
    const { header } = homePage;
    await homePage.goto();
    await header.openLogin();
    await signInPage.signIn(accounts.customer);
    await header.accountButton('Free Member').click();
    await header.menuItem('Sign Out').click();

    await header.expectLoggedOut();
  });

  test(
    'TC-16 route cửa hàng cũ là 404',
    { tag: '@regression' },
    async ({ page, notFoundPage }, testInfo) => {
      /** @type {string[]} */
      const pageErrors = [];
      page.on('pageerror', (e) => pageErrors.push(e.message));

      for (const path of ['/luts', '/pricing', '/bo-suu-tap', '/goi-cua-toi']) {
        await test.step(path, async () => {
          await notFoundPage.goto(path);
          await expect(notFoundPage.message).toBeVisible();
        });
      }
      await docShot(page, testInfo, '04-route-cu-404');
      expect(pageErrors).toEqual([]);
    }
  );
});

test.describe('Quản trị sau khi gỡ LUT (toàn quyền)', () => {
  test.use({ storageState: storageStateOf('admin') });

  test(
    'TC-17 menu chỉ còn Hệ thống, trang chủ không có bảng số liệu',
    { tag: '@smoke' },
    async ({ page, adminLayout }, testInfo) => {
      await adminLayout.goto();
      await expect(adminLayout.greeting).toBeVisible();
      await adminLayout.openSidebar();

      for (const name of SYSTEM_MENU) await expect(adminLayout.menuItem(name)).toBeVisible();
      for (const name of REMOVED_ADMIN_MENU)
        await expect(adminLayout.menuItem(name)).toHaveCount(0);
      await expect(page.getByText('Revenue')).toHaveCount(0);
      await docShot(page, testInfo, '05-admin-trang-chu');
    }
  );

  test('TC-18 route admin cũ là 404', { tag: '@regression' }, async ({ notFoundPage }) => {
    for (const path of ['/admin/luts', '/admin/goi-y', '/admin/dac-trung-mau']) {
      await test.step(path, async () => {
        await notFoundPage.goto(path);
        await expect(notFoundPage.message).toBeVisible();
      });
    }
  });

  test(
    'TC-19 trang phân quyền vẫn chạy sau khi xoá resource',
    { tag: '@regression' },
    async ({ page, apiAs, permissionPage }, testInfo) => {
      const admin = await apiAs('admin');
      const role = await admin.role.findByName('No Access');
      expect(role, 'chức vụ "No Access" có trong seed').toBeTruthy();

      await permissionPage.openForRole(role.id);
      await expect(permissionPage.heading).toBeVisible();
      await expect(permissionPage.resourceRow('Role Management')).toBeVisible();
      for (const removed of ['LUT Management', 'Recommendation Admin', 'Dashboard']) {
        await expect(permissionPage.resourceRow(removed)).toHaveCount(0);
      }
      await docShot(page, testInfo, '06-phan-quyen');
    }
  );
});

test.describe('Quản trị sau khi gỡ LUT (không quyền)', () => {
  test.use({ storageState: storageStateOf('noaccess') });

  test('TC-20 noaccess chỉ thấy Home', { tag: '@regression' }, async ({ adminLayout }) => {
    await adminLayout.goto();
    await expect(adminLayout.greeting).toBeVisible();
    await adminLayout.openSidebar();

    await expect(adminLayout.menuItem('Home')).toBeVisible();
    for (const name of [...SYSTEM_MENU, ...REMOVED_ADMIN_MENU]) {
      await expect(adminLayout.menuItem(name)).toHaveCount(0);
    }
  });
});
