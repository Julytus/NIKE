import { accounts, storageStateOf } from '../../data/accounts.js';
import { expect, test } from '../../fixtures/index.js';
import { docShot } from '../../utils/doc-shot.js';
import { uniqueEmail } from '../../utils/unique.js';

/**
 * Lát `go-lut` (plan/go-lut.md §6, §9 TC-12 → TC-20): giao diện sau khi gỡ LUT —
 * trang chủ `/` (sửa theo lát giao-dien-nike), hộp thoại đăng ký / đăng nhập, menu tài khoản, route cũ 404, admin chỉ còn Hệ thống.
 */

const SYSTEM_MENU = ['Chức vụ', 'Phân quyền', 'Tài nguyên', 'Module'];
const REMOVED_ADMIN_MENU = ['LUT', 'Đặc trưng màu', 'Gợi ý'];

test.describe('Cửa hàng sau khi gỡ LUT', () => {
  // TC-12 → TC-15 sửa theo lát giao-dien-nike (§7.1 bước 6): `/` là trang chủ Nike, nút "Đăng ký" đổi thành
  // "Tham gia" (mobile nằm trong menu trượt), nút tài khoản đọc "Xin chào, <tên>".
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
    async ({ page, homePage }, testInfo) => {
      await homePage.goto();
      await homePage.header.openRegister();
      await expect(homePage.registerDialog.root).toBeVisible();
      await docShot(page, testInfo, '02-dang-ky');

      await homePage.registerDialog.register({
        name: 'Auto Test',
        email: uniqueEmail(),
        password: 'Admin@123',
      });

      await expect(homePage.registerDialog.root).toBeHidden();
      await expect(homePage.header.accountButton('Auto Test')).toBeVisible();
      await expect(page.getByText('Bạn thích phong cách màu nào?')).toHaveCount(0);
    }
  );

  test(
    'TC-14 menu tài khoản khách chỉ còn mục cơ bản',
    { tag: '@regression' },
    async ({ page, homePage }, testInfo) => {
      const { header, loginDialog } = homePage;
      await homePage.goto();
      await header.openLogin();
      await expect(loginDialog.description).toBeVisible();
      await loginDialog.login(accounts.customer);
      await expect(loginDialog.root).toBeHidden();

      await header.accountButton('Khách Miễn Phí').click();
      await expect(header.accountMenu.getByText('Khách Miễn Phí', { exact: true })).toBeVisible();
      await expect(
        header.accountMenu.getByText(accounts.customer.email, { exact: true })
      ).toBeVisible();
      await expect(header.menuItem('Đăng xuất')).toBeVisible();
      for (const removed of [
        'Gói của tôi',
        'Bộ sưu tập',
        'Sở thích màu',
        'Xoá lịch sử gợi ý',
        'Trang quản trị',
      ]) {
        await expect(header.accountMenu.getByText(removed)).toHaveCount(0);
      }
      await docShot(page, testInfo, '03-menu-tai-khoan');
    }
  );

  test('TC-15 đăng xuất', { tag: '@regression' }, async ({ homePage }) => {
    const { header, loginDialog } = homePage;
    await homePage.goto();
    await header.openLogin();
    await loginDialog.login(accounts.customer);
    await header.accountButton('Khách Miễn Phí').click();
    await header.menuItem('Đăng xuất').click();

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
