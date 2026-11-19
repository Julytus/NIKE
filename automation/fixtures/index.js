import { test as base, expect } from '@playwright/test';

import { createApi } from '../api/index.js';
import { accounts } from '../data/accounts.js';
import { AdminLayout } from '../pages/AdminLayout.js';
import { AdminLoginPage } from '../pages/AdminLoginPage.js';
import { HomePage } from '../pages/HomePage.js';
import { InfoPage } from '../pages/InfoPage.js';
import { NotFoundPage } from '../pages/NotFoundPage.js';
import { PermissionPage } from '../pages/PermissionPage.js';
import { ProductListPage } from '../pages/ProductListPage.js';
import { ResourcePage } from '../pages/ResourcePage.js';
import { RolePage } from '../pages/RolePage.js';
import { SignInPage } from '../pages/SignInPage.js';

/** @typedef {'admin' | 'noaccess' | 'customer' | 'khach1' | 'khach2'} Role */

/**
 * @typedef {{
 *   api: import('../api/index.js').Api,
 *   apiAs: (role: Role) => Promise<import('../api/index.js').Api>,
 *   loginPage: AdminLoginPage,
 *   adminLayout: AdminLayout,
 *   rolePage: RolePage,
 *   permissionPage: PermissionPage,
 *   resourcePage: ResourcePage,
 *   homePage: HomePage,
 *   infoPage: InfoPage,
 *   notFoundPage: NotFoundPage,
 *   signInPage: SignInPage,
 *   productListPage: ProductListPage,
 * }} TestFixtures
 * @typedef {{ tokenCache: { get: (role: Role) => Promise<string> } }} WorkerFixtures
 */

/**
 * `test` dùng chung cho mọi spec:
 * - `api`: API client chưa đăng nhập.
 * - `apiAs(role)`: API client đã gắn token của vai trò (đăng nhập bằng API một lần mỗi worker).
 * - Page object: `loginPage`, `adminLayout`, `rolePage`, `permissionPage`, `resourcePage`, `homePage`, `infoPage`, `notFoundPage`, `signInPage`, `productListPage`.
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

  permissionPage: async ({ page }, use) => {
    await use(new PermissionPage(page));
  },

  resourcePage: async ({ page }, use) => {
    await use(new ResourcePage(page));
  },

  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },

  infoPage: async ({ page }, use) => {
    await use(new InfoPage(page));
  },

  notFoundPage: async ({ page }, use) => {
    await use(new NotFoundPage(page));
  },

  signInPage: async ({ page }, use) => {
    await use(new SignInPage(page));
  },

  productListPage: async ({ page }, use) => {
    await use(new ProductListPage(page));
  },
});

export { expect };
