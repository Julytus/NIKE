import { test as base, expect } from '@playwright/test';

import { createApi } from '../api/index.js';
import { accounts } from '../data/accounts.js';
import { AdminLayout } from '../pages/AdminLayout.js';
import { AdminLoginPage } from '../pages/AdminLoginPage.js';
import { RolePage } from '../pages/RolePage.js';

/** @typedef {'admin' | 'noaccess' | 'customer'} Role */

/**
 * @typedef {{
 *   api: import('../api/index.js').Api,
 *   apiAs: (role: Role) => Promise<import('../api/index.js').Api>,
 *   loginPage: AdminLoginPage,
 *   adminLayout: AdminLayout,
 *   rolePage: RolePage,
 * }} TestFixtures
 * @typedef {{ tokenCache: { get: (role: Role) => Promise<string> } }} WorkerFixtures
 */

/**
 * `test` dùng chung cho mọi spec:
 * - `api`: API client chưa đăng nhập.
 * - `apiAs(role)`: API client đã gắn token của vai trò (đăng nhập bằng API một lần mỗi worker).
 * - Page object: `loginPage`, `adminLayout`, `rolePage`.
 * Đăng nhập giao diện dùng `test.use({ storageState: storageStateOf('admin') })` (tạo ở auth.setup.js).
 * @type {import('@playwright/test').TestType<
 *   import('@playwright/test').PlaywrightTestArgs & import('@playwright/test').PlaywrightTestOptions & TestFixtures,
 *   import('@playwright/test').PlaywrightWorkerArgs & import('@playwright/test').PlaywrightWorkerOptions & WorkerFixtures
 * >}
 */
export const test = base.extend({
  tokenCache: [
    async ({ playwright }, use) => {
      const context = await playwright.request.newContext();
      /** @type {Map<Role, Promise<string>>} */
      const cache = new Map();
      const get = (/** @type {Role} */ role) => {
        if (!cache.has(role)) {
          cache.set(
            role,
            createApi(context)
              .auth.loginOk(accounts[role])
              .then((r) => r.token)
          );
        }
        return /** @type {Promise<string>} */ (cache.get(role));
      };
      await use({ get });
      await context.dispose();
    },
    { scope: 'worker' },
  ],

  api: async ({ request }, use) => {
    await use(createApi(request));
  },

  apiAs: async ({ request, tokenCache }, use) => {
    await use(async (role) => createApi(request, await tokenCache.get(role)));
  },

  loginPage: async ({ page }, use) => {
    await use(new AdminLoginPage(page));
  },

  adminLayout: async ({ page }, use) => {
    await use(new AdminLayout(page));
  },

  rolePage: async ({ page }, use) => {
    await use(new RolePage(page));
  },
});

export { expect };
