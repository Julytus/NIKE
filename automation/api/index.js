import { AccountApi } from './AccountApi.js';
import { ApiClient } from './ApiClient.js';
import { AuthApi } from './AuthApi.js';
import { CartApi } from './CartApi.js';
import { ProductApi } from './ProductApi.js';
import { ResourceApi } from './ResourceApi.js';
import { RoleApi } from './RoleApi.js';
import { TestSupportApi } from './TestSupportApi.js';

/**
 * Gom các API client dùng chung một `ApiClient` (cùng token).
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {string | null} [token]
 */
export function createApi(request, token = null) {
  const client = new ApiClient(request, { token });
  return {
    client,
    auth: new AuthApi(client),
    account: new AccountApi(client),
    role: new RoleApi(client),
    resource: new ResourceApi(client),
    product: new ProductApi(client),
    cart: new CartApi(client),
    testSupport: new TestSupportApi(client),
    /** Đổi token cho mọi API trong nhóm. @param {string | null} t */
    useToken(t) {
      client.setToken(t);
      return this;
    },
  };
}

/** @typedef {ReturnType<typeof createApi>} Api */

export { AccountApi, ApiClient, AuthApi, CartApi, ProductApi, ResourceApi, RoleApi, TestSupportApi };
