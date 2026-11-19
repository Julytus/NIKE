import { mkdirSync } from 'node:fs';

import { accountNames, accounts, storageStateOf } from '../data/accounts.js';
import { expect, test as setup } from '../fixtures/index.js';
import { HeaderComponent } from '../pages/components/HeaderComponent.js';

mkdirSync('.auth', { recursive: true });

/** Đăng nhập giao diện một lần cho mỗi vai trò quản trị, lưu storageState để spec dùng lại. */
for (const role of /** @type {const} */ (['admin', 'noaccess'])) {
  setup(`đăng nhập sẵn: ${role}`, async ({ page, loginPage }) => {
    await loginPage.goto();
    await loginPage.login(accounts[role]);
    await expect(page).toHaveURL(/\/admin\/?$/);
    await expect(page.getByRole('heading', { name: /^Hi[, ]/ })).toBeVisible();
    await page.context().storageState({ path: storageStateOf(role) });
  });
}

/**
 * Khách hàng test đăng nhập sẵn ở cửa hàng qua `/signin` (plan dat-hang §7.1 bước 4): dùng cho `/checkout`,
 * trang xác nhận đơn. Chờ header hiện "Hi, <tên>" (phiên đã nạp xong) rồi mới lưu.
 */
for (const role of /** @type {const} */ (['khach1', 'khach2'])) {
  setup(`đăng nhập sẵn: ${role}`, async ({ page, signInPage }) => {
    await signInPage.goto();
    await signInPage.signIn(accounts[role]);
    await expect(new HeaderComponent(page).accountButton(accountNames[role])).toBeVisible();
    await page.context().storageState({ path: storageStateOf(role) });
  });
}
