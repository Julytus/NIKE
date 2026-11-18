import { accounts, storageStateOf } from '../../data/accounts.js';
import { expect, test } from '../../fixtures/index.js';
import { docShot } from '../../utils/doc-shot.js';
import { uniqueEmail } from '../../utils/unique.js';

/**
 * Lát `go-lut` (plan/go-lut.md §6, §9 TC-12 → TC-20): giao diện sau khi gỡ LUT —
 * trang tạm `/`, hộp thoại đăng ký / đăng nhập, menu tài khoản, route cũ 404, admin chỉ còn Hệ thống.
 */

const SYSTEM_MENU = ['Chức vụ', 'Phân quyền', 'Tài nguyên', 'Module'];
const REMOVED_ADMIN_MENU = ['LUT', 'Đặc trưng màu', 'Gợi ý'];

test.describe('Cửa hàng: trang tạm sau khi gỡ LUT', () => {
  test('TC-12 trang tạm / cho khách', { tag: '@smoke' }, async ({ page, shopHome }, testInfo) => {
    await shopHome.goto();

    await expect(page).toHaveTitle('Nike. Just Do It.');
    await expect(shopHome.heading).toBeVisible();
    await expect(shopHome.description).toBeVisible();
    await expect(shopHome.loginButton).toBeVisible();
    await expect(shopHome.registerButton).toBeVisible();
    await expect(page.locator('body')).not.toContainText('LUT');
    await docShot(page, testInfo, '01-trang-tam');
  });

  test(
    'TC-13 đăng ký không còn bước chọn phong cách',
    { tag: '@regression' },
    async ({ page, shopHome }, testInfo) => {
      await shopHome.goto();
      await shopHome.registerButton.click();
      await expect(shopHome.registerDialog.root).toBeVisible();
      await docShot(page, testInfo, '02-dang-ky');

      await shopHome.registerDialog.register({
        name: 'Auto Test',
        email: uniqueEmail(),
        password: 'Admin@123',
      });

      await expect(shopHome.registerDialog.root).toBeHidden();
      await expect(shopHome.accountButton('Auto Test')).toBeVisible();
      await expect(page.getByText('Bạn thích phong cách màu nào?')).toHaveCount(0);
    }
  );

  test(
    'TC-14 menu tài khoản khách chỉ còn mục cơ bản',
    { tag: '@regression' },
    async ({ page, shopHome }, testInfo) => {
      await shopHome.goto();
      await shopHome.loginButton.click();
      await expect(shopHome.loginDialog.description).toBeVisible();
      await shopHome.loginDialog.login(accounts.customer);
      await expect(shopHome.loginDialog.root).toBeHidden();

      await shopHome.accountButton('Khách Miễn Phí').click();
      await expect(shopHome.accountMenu.getByText('Khách Miễn Phí', { exact: true })).toBeVisible();
      await expect(
        shopHome.accountMenu.getByText(accounts.customer.email, { exact: true })
      ).toBeVisible();
      await expect(shopHome.menuItem('Đăng xuất')).toBeVisible();
      for (const removed of [
        'Gói của tôi',
        'Bộ sưu tập',
        'Sở thích màu',
        'Xoá lịch sử gợi ý',
        'Trang quản trị',
      ]) {
        await expect(shopHome.accountMenu.getByText(removed)).toHaveCount(0);
      }
      await docShot(page, testInfo, '03-menu-tai-khoan');
    }
  );

  test('TC-15 đăng xuất', { tag: '@regression' }, async ({ shopHome }) => {
    await shopHome.goto();
    await shopHome.login(accounts.customer);
    await shopHome.accountButton('Khách Miễn Phí').click();
    await shopHome.menuItem('Đăng xuất').click();

    await expect(shopHome.loginButton).toBeVisible();
    await expect(shopHome.registerButton).toBeVisible();
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
      await expect(page.getByText('Doanh thu')).toHaveCount(0);
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
      const role = await admin.role.findByName('Không quyền');
      expect(role, 'chức vụ "Không quyền" có trong seed').toBeTruthy();

      await permissionPage.openForRole(role.id);
      await expect(permissionPage.heading).toBeVisible();
      await expect(permissionPage.resourceRow('Quản lý chức vụ')).toBeVisible();
      for (const removed of ['Quản lý LUT', 'Quản trị gợi ý', 'Bảng số liệu']) {
        await expect(permissionPage.resourceRow(removed)).toHaveCount(0);
      }
      await docShot(page, testInfo, '06-phan-quyen');
    }
  );
});

test.describe('Quản trị sau khi gỡ LUT (không quyền)', () => {
  test.use({ storageState: storageStateOf('noaccess') });

  test('TC-20 noaccess chỉ thấy Trang chủ', { tag: '@regression' }, async ({ adminLayout }) => {
    await adminLayout.goto();
    await expect(adminLayout.greeting).toBeVisible();
    await adminLayout.openSidebar();

    await expect(adminLayout.menuItem('Trang chủ')).toBeVisible();
    for (const name of [...SYSTEM_MENU, ...REMOVED_ADMIN_MENU]) {
      await expect(adminLayout.menuItem(name)).toHaveCount(0);
    }
  });
});
