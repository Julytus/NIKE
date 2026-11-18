import { AccountApi } from './AccountApi.js';
import { ApiClient } from './ApiClient.js';
import { AuthApi } from './AuthApi.js';
import { RoleApi } from './RoleApi.js';

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
    /** Đổi token cho mọi API trong nhóm. @param {string | null} t */
    useToken(t) {
      client.setToken(t);
      return this;
    },
  };
}

/** @typedef {ReturnType<typeof createApi>} Api */

export { AccountApi, ApiClient, AuthApi, RoleApi };
