import { mkdirSync } from 'node:fs';

import { accounts, storageStateOf } from '../data/accounts.js';
import { expect, test as setup } from '../fixtures/index.js';

mkdirSync('.auth', { recursive: true });

/** Đăng nhập giao diện một lần cho mỗi vai trò quản trị, lưu storageState để spec dùng lại. */
for (const role of /** @type {const} */ (['admin', 'noaccess'])) {
  setup(`đăng nhập sẵn: ${role}`, async ({ page, loginPage }) => {
    await loginPage.goto();
    await loginPage.login(accounts[role]);
    await expect(page).toHaveURL(/\/admin\/?$/);
    await expect(page.getByRole('heading', { name: /^Xin chào/ })).toBeVisible();
    await page.context().storageState({ path: storageStateOf(role) });
  });
}
