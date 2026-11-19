import { accountNames, accounts, storageStateOf, WRONG_PASSWORD } from '../../data/accounts.js';
import adminRoutes from '../../data/admin-routes.json' with { type: 'json' };
import roleNames from '../../data/role-names.json' with { type: 'json' };
import { expect, test } from '../../fixtures/index.js';
import { docShot } from '../../utils/doc-shot.js';
import { uniqueTitle } from '../../utils/unique.js';
import { scanVietnamese } from '../../utils/vietnamese.js';

/**
 * Lát `tieng-anh-cua-hang` (plan/tieng-anh-cua-hang.md §6.9, §9 TC-19 → TC-22): trang quản trị + `/login`
 * quản trị tiếng Anh — quét chữ có dấu, CRUD chức vụ, không quyền, URL quản trị cũ 404.
 */

const NOT_FOUND = "We can't find the page you're looking for.";
const MOBILE = 'mobile-chrome';
const CHROMIUM = 'chromium';
/** Dữ liệu người dùng nhập (ô bảng, tên chức vụ đang chọn) không thuộc phạm vi chuyển ngữ (plan §11.5). */
const USER_DATA = 'tbody td, [data-slot="select-value"]';

/**
 * Khẳng định không còn chữ có dấu tiếng Việt trong `root` (bỏ qua dữ liệu người dùng).
 * @param {import('@playwright/test').Locator} root
 * @param {string} where
 */
async function expectNoVietnamese(root, where) {
  const hits = await scanVietnamese(root, { exclude: USER_DATA });
  expect(hits, `${where} còn chữ tiếng Việt:\n${hits.join('\n')}`).toEqual([]);
}

/**
 * Nút "Add <loại>" của bảng (màn hẹp chỉ còn icon "+").
 * @param {import('@playwright/test').Page} page
 * @param {string} label
 */
const addButton = (page, label) =>
  page
    .getByRole('button', { name: label, exact: true })
    .or(page.locator('button:has(svg.lucide-plus)'))
    .first();

/**
 * Chờ bảng tải xong: có dòng dữ liệu hoặc "No results.".
 * @param {import('@playwright/test').Page} page
 */
async function waitTableLoaded(page) {
  await expect(
    page
      .locator('tbody tr td')
      .first()
      .or(page.getByText('No results.', { exact: true }))
  ).toBeVisible();
  await expect(page.getByText('Loading data...')).toHaveCount(0);
}

test.describe('Quản trị tiếng Anh: quét chữ (toàn quyền)', () => {
  test.use({ storageState: storageStateOf('admin') });

  test.beforeEach(({}, testInfo) => {
    test.skip(
      ![CHROMIUM, MOBILE].includes(testInfo.project.name),
      'TC-19 chạy ở chromium + mobile-chrome (plan §9)'
    );
  });

  for (const route of adminRoutes.routes) {
    test(
      `TC-19 không còn chữ tiếng Việt: ${route.path}`,
      { tag: '@regression' },
      async ({ page, adminLayout }) => {
        await adminLayout.goto(route.path);
        await expect(page.getByRole('heading', { name: route.heading, exact: true })).toBeVisible();
        if (['/admin/roles', '/admin/resources', '/admin/modules'].includes(route.path)) {
          await waitTableLoaded(page);
        }
        if (route.path === '/admin/permissions') {
          await expect(page.getByRole('table').or(page.getByRole('alert')).first()).toBeVisible();
        }

        await expect(page).toHaveTitle(route.title);
        await expect(page.locator('html')).toHaveAttribute('lang', 'en');
        await adminLayout.openSidebar();
        for (const name of ['Home', 'Roles', 'Permissions', 'Resources', 'Modules']) {
          await expect(adminLayout.menuItem(name)).toBeVisible();
        }
        await expectNoVietnamese(page.locator('body'), route.path);
      }
    );
  }

  test(
    'TC-19 không còn chữ tiếng Việt: hộp thoại quản trị',
    { tag: '@regression' },
    async ({ page, rolePage }, testInfo) => {
      await test.step('Add Role + lỗi validate', async () => {
        await rolePage.open();
        await waitTableLoaded(page);
        await expect(page.getByRole('columnheader', { name: 'Role' })).toBeVisible();
        if (testInfo.project.name === CHROMIUM) {
          await expect(page.getByRole('button', { name: 'Add Role', exact: true })).toBeVisible();
        }
        const dialog = await rolePage.openCreate();
        await expect(dialog.title()).toHaveText('Create Role');
        await dialog.createButton.click();
        await expect(dialog.error(roleNames.requiredMessage)).toBeVisible();
        await expectNoVietnamese(dialog.root, 'Create Role');
        await docShot(page, testInfo, '01-tao-chuc-vu-loi');
        await dialog.cancelButton.click();
        await expect(dialog.root).toBeHidden();
      });

      await test.step('Add Resource + lỗi validate', async () => {
        await rolePage.goto('/admin/resources');
        await waitTableLoaded(page);
        await addButton(page, 'Add Resource').click();
        const dialog = page.getByRole('dialog', { name: 'Create Resource' });
        await expect(dialog).toBeVisible();
        await dialog.getByRole('button', { name: 'Create', exact: true }).click();
        await expect(
          dialog.getByText('Please enter a resource name', { exact: true })
        ).toBeVisible();
        await expectNoVietnamese(dialog, 'Create Resource');
        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();
      });

      await test.step('Add Module + lỗi validate', async () => {
        await rolePage.goto('/admin/modules');
        await waitTableLoaded(page);
        await addButton(page, 'Add Module').click();
        const dialog = page.getByRole('dialog', { name: 'Create Module' });
        await expect(dialog).toBeVisible();
        await dialog.getByRole('button', { name: 'Create', exact: true }).click();
        await expect(dialog.getByText('Please enter a module name', { exact: true })).toBeVisible();
        await expectNoVietnamese(dialog, 'Create Module');
        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();
      });

      await test.step('Assign Resources + dialog xoá module', async () => {
        const actions = page.getByRole('button', { name: 'Actions Store', exact: true });
        await actions.click();
        await page.getByRole('menuitem', { name: 'Assign Resources', exact: true }).click();
        const assign = page.getByRole('dialog', { name: 'Assign Resources' });
        await expect(assign).toBeVisible();
        await expect(assign.getByText('Loading resources...')).toHaveCount(0);
        await expectNoVietnamese(assign, 'Assign Resources');
        await assign.getByRole('button', { name: 'Cancel', exact: true }).click();
        await expect(assign).toBeHidden();

        await actions.click();
        await page.getByRole('menuitem', { name: 'Delete', exact: true }).click();
        const confirm = page.getByRole('alertdialog');
        await expect(confirm).toBeVisible();
        await expectNoVietnamese(confirm, 'dialog xoá module');
        await confirm.getByRole('button', { name: 'Cancel', exact: true }).click();
        await expect(confirm).toBeHidden();
      });
    }
  );
});

test.describe('Quản trị tiếng Anh: /login (chromium)', () => {
  test.beforeEach(({}, testInfo) => {
    // Đăng nhập sai chỉ chạy một trình duyệt để không cộng dồn lần sai (khoá tạm sau 10 lần)
    test.skip(testInfo.project.name !== CHROMIUM, 'Chỉ chạy ở chromium (plan §9)');
  });

  test(
    'TC-20 trang /login quản trị tiếng Anh',
    { tag: '@smoke' },
    async ({ page, loginPage, adminLayout }, testInfo) => {
      await loginPage.goto();
      await expect(page).toHaveTitle('Sign In | Nike Admin');
      await expect(loginPage.submitButton).toBeVisible();
      await expectNoVietnamese(page.locator('body'), '/login');

      await loginPage.submitButton.click();
      await expect(
        page.getByText('Please enter your email or phone number', { exact: true })
      ).toBeVisible();
      await expect(page.getByText('Please enter your password', { exact: true })).toBeVisible();
      await expectNoVietnamese(page.locator('body'), '/login lỗi validate');
      await docShot(page, testInfo, '02-dang-nhap-quan-tri');

      await loginPage.login({ email: accounts.admin.email, password: WRONG_PASSWORD });
      await expect(loginPage.toast('Incorrect email or password.')).toBeVisible();
      await expect(page).toHaveURL(/\/login$/);

      await loginPage.login(accounts.admin);
      await expect(loginPage.toast('Signed in successfully')).toBeVisible();
      await expect(page).toHaveURL(/\/admin\/?$/);
      await expect(
        page.getByRole('heading', { name: `Hi, ${accountNames.admin}`, exact: true })
      ).toBeVisible();
      await expect(adminLayout.greeting).toBeVisible();
    }
  );
});

test.describe('Quản trị tiếng Anh: CRUD chức vụ (chromium)', () => {
  test.use({ storageState: storageStateOf('admin') });

  /** @type {string[]} */
  let created = [];

  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== CHROMIUM, 'Chỉ chạy ở chromium (plan §9)');
    created = [];
  });

  test.afterEach(async ({ apiAs }) => {
    const admin = await apiAs('admin');
    for (const name of created) {
      const role = await admin.role.findByName(name);
      if (role) await admin.role.delete(role.id);
    }
  });

  test(
    'TC-21 CRUD chức vụ bằng chữ tiếng Anh',
    { tag: '@smoke' },
    async ({ page, rolePage }, testInfo) => {
      const name = uniqueTitle(roleNames.testRolePrefix);
      const renamed = `${name} Edited`;
      created.push(name, renamed);

      await rolePage.open();
      let dialog = await rolePage.openCreate();
      await dialog.create(name);
      await expect(dialog.root).toBeHidden();
      await expect(rolePage.toast('Role created')).toBeVisible();

      dialog = await rolePage.openCreate();
      await dialog.create(name);
      await expect(page.getByText(roleNames.duplicateMessage).first()).toBeVisible();
      await docShot(page, testInfo, '03-chuc-vu-trung-ten');
      await dialog.cancelButton.click();
      await expect(dialog.root).toBeHidden();

      await rolePage.search(name);
      await expect(rolePage.row(name)).toBeVisible();
      dialog = await rolePage.edit(name);
      await expect(dialog.title()).toHaveText('Edit Role');
      await dialog.update(renamed);
      await expect(dialog.root).toBeHidden();
      await expect(rolePage.toast('Role updated')).toBeVisible();
      await expect(rolePage.row(renamed)).toBeVisible();

      const confirm = await rolePage.delete(renamed);
      await expect(
        confirm.root.getByRole('heading', { name: 'Delete role', exact: true })
      ).toBeVisible();
      await confirm.confirm();
      await expect(rolePage.toast('Role deleted')).toBeVisible();
      await expect(rolePage.row(renamed)).toHaveCount(0);
    }
  );
});

test.describe('Quản trị tiếng Anh: không quyền', () => {
  test.use({ storageState: storageStateOf('noaccess') });

  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== CHROMIUM, 'Chỉ chạy ở chromium (plan §9)');
  });

  test(
    'TC-22 noaccess mở /admin/roles bị từ chối',
    { tag: '@regression' },
    async ({ page, rolePage, adminLayout }) => {
      await rolePage.goto();
      await expect(adminLayout.accessDenied).toBeVisible();
      await expect(
        page.getByText("You don't have permission to view this page.", { exact: true })
      ).toBeVisible();
    }
  );
});

test.describe('Quản trị tiếng Anh: URL cũ', () => {
  test.use({ storageState: storageStateOf('admin') });

  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== CHROMIUM, 'Chỉ chạy ở chromium (plan §9)');
  });

  test(
    'TC-22 URL quản trị tiếng Việt cũ là 404',
    { tag: '@regression' },
    async ({ notFoundPage }) => {
      for (const path of [
        '/admin/chuc-vu',
        '/admin/phan-quyen',
        '/admin/tai-nguyen',
        '/admin/module',
      ]) {
        await test.step(path, async () => {
          await notFoundPage.goto(path);
          await expect(notFoundPage.page.getByText(NOT_FOUND, { exact: true })).toBeVisible();
        });
      }
    }
  );
});
