import { storageStateOf } from '../../data/accounts.js';
import roleNames from '../../data/role-names.json' with { type: 'json' };
import { expect, test } from '../../fixtures/index.js';
import { docShot } from '../../utils/doc-shot.js';
import { uniqueName, uniqueNameOfLength } from '../../utils/unique.js';

test.describe('Quản trị Chức vụ (toàn quyền)', () => {
  test.use({ storageState: storageStateOf('admin') });

  /** Tên chức vụ do test hiện tại sinh ra, dọn bằng API sau mỗi test. */
  let created = [];

  test.beforeEach(() => {
    created = [];
  });

  test.afterEach(async ({ apiAs }) => {
    const admin = await apiAs('admin');
    for (const name of created) {
      const role = await admin.role.findByName(name);
      if (role) await admin.role.delete(role.id);
    }
  });

  test('TC-14 tạo chức vụ mới', { tag: '@smoke' }, async ({ rolePage }, testInfo) => {
    const name = uniqueName('role');
    created.push(name);

    await rolePage.open();
    const dialog = await rolePage.openCreate();
    await expect(dialog.title()).toHaveText('Create Role');
    await dialog.nameInput.fill(name);
    await docShot(rolePage.page, testInfo, '04-tao-chuc-vu');
    await dialog.createButton.click();

    await expect(dialog.root).toBeHidden();
    await expect(rolePage.toast('Role created')).toBeVisible();
    await rolePage.search(name);
    await expect(rolePage.dataRows).toHaveCount(1);
    await expect(rolePage.row(name)).toBeVisible();
    await docShot(rolePage.page, testInfo, '05-da-tao-chuc-vu');
  });

  test('TC-15 sửa tên chức vụ', { tag: '@regression' }, async ({ rolePage, apiAs }, testInfo) => {
    const name = uniqueName('role');
    const renamed = `${name}-sua`;
    created.push(name, renamed);
    await (await apiAs('admin')).role.create(name);

    await rolePage.open();
    await rolePage.search(name);
    const dialog = await rolePage.edit(name);
    await expect(dialog.title()).toHaveText('Edit Role');
    await expect(dialog.nameInput).toHaveValue(name);
    await dialog.nameInput.fill(renamed);
    await docShot(rolePage.page, testInfo, '06-sua-chuc-vu');
    await dialog.updateButton.click();

    await expect(dialog.root).toBeHidden();
    await expect(rolePage.toast('Role updated')).toBeVisible();
    await expect(rolePage.row(renamed)).toBeVisible();
    await expect(rolePage.row(name)).toHaveCount(0);
  });

  test('TC-16 xoá chức vụ', { tag: '@regression' }, async ({ rolePage, apiAs }, testInfo) => {
    const name = uniqueName('role');
    created.push(name);
    await (await apiAs('admin')).role.create(name);

    await rolePage.open();
    await rolePage.search(name);
    const confirm = await rolePage.delete(name);
    await expect(confirm.root).toContainText(name);
    await docShot(rolePage.page, testInfo, '07-xac-nhan-xoa');
    await confirm.confirm();

    await expect(rolePage.toast('Role deleted')).toBeVisible();
    await expect(rolePage.row(name)).toHaveCount(0);
    await expect(rolePage.page.getByText('No results.')).toBeVisible();
  });

  test(
    'TC-17 kiểm tra tên chức vụ theo giá trị biên',
    { tag: '@regression' },
    async ({ rolePage }, testInfo) => {
      const tooLong = uniqueNameOfLength(roleNames.maxLength + 1);
      const maxLen = uniqueNameOfLength(roleNames.maxLength);
      created.push(maxLen);

      await rolePage.open();
      const dialog = await rolePage.openCreate();

      // Để trống
      await dialog.nameInput.fill(roleNames.empty);
      await dialog.createButton.click();
      await expect(dialog.error(roleNames.requiredMessage)).toBeVisible();

      // Chỉ có khoảng trắng (bị cắt) cũng coi là trống
      await dialog.nameInput.fill(roleNames.spacesOnly);
      await dialog.createButton.click();
      await expect(dialog.error(roleNames.requiredMessage)).toBeVisible();

      // 51 ký tự: vượt biên trên
      expect(tooLong).toHaveLength(roleNames.maxLength + 1);
      await dialog.nameInput.fill(tooLong);
      await dialog.createButton.click();
      await expect(dialog.error(roleNames.tooLongMessage)).toBeVisible();
      await docShot(rolePage.page, testInfo, '08-ten-qua-dai');

      // 50 ký tự: đúng biên trên, tạo được
      expect(maxLen).toHaveLength(roleNames.maxLength);
      await dialog.nameInput.fill(maxLen);
      await dialog.createButton.click();
      await expect(dialog.root).toBeHidden();
      await rolePage.search(maxLen);
      await expect(rolePage.row(maxLen)).toBeVisible();
    }
  );
});

test.describe('Quản trị Chức vụ (không quyền)', () => {
  test.use({ storageState: storageStateOf('noaccess') });

  test(
    'TC-18 tài khoản không quyền không thấy Roles',
    { tag: '@regression' },
    async ({ page, adminLayout, rolePage }, testInfo) => {
      await adminLayout.goto();
      await expect(adminLayout.greeting).toBeVisible();
      await adminLayout.openSidebar();
      await expect(adminLayout.menuItem('Home')).toBeVisible();
      await expect(adminLayout.menuItem('Roles')).toHaveCount(0);

      await rolePage.goto();
      await expect(adminLayout.accessDenied).toBeVisible();
      await expect(page.getByText("You don't have permission to view this page.")).toBeVisible();
      await expect(rolePage.addButton).toHaveCount(0);
      await docShot(page, testInfo, '09-khong-quyen');
    }
  );
});
