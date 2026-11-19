import { accounts } from '../../data/accounts.js';
import { expect, test } from '../../fixtures/index.js';
import { uniqueEmail } from '../../utils/unique.js';

/**
 * Lát `go-lut` (plan/go-lut.md §5, §9 TC-01 → TC-11): mọi API LUT / gói / tải / bộ sưu tập /
 * gợi ý / dashboard đã bị xoá (404), nền dùng chung vẫn chạy.
 */

/** Message của handler `NoResourceFoundException` (giữ nguyên, plan §5.4). */
const NOT_FOUND = 'API not found';

/**
 * Gọi lần lượt các endpoint `[method, path, body?]` và khẳng định đều 404.
 * @param {import('../../api/index.js').Api} api
 * @param {[('GET' | 'POST'), string, unknown?][]} endpoints
 */
async function expectAllRemoved(api, endpoints) {
  for (const [method, path, body] of endpoints) {
    const res = method === 'GET' ? await api.client.get(path) : await api.client.post(path, body);

    await test.step(`${method} ${path} → 404`, async () => {
      await api.client.expectError(res, 404, NOT_FOUND);
    });
  }
}

test.describe('API sau khi gỡ LUT', () => {
  test('TC-01 API kho LUT công khai đã bị xoá', { tag: '@smoke' }, async ({ api }) => {
    await expectAllRemoved(api, [
      ['GET', '/lut/public/list'],
      ['GET', '/lut-category/public/list'],
      ['GET', '/lut/public/suggest?q=a'],
    ]);
  });

  test('TC-02 API quản trị LUT đã bị xoá', { tag: '@regression' }, async ({ apiAs }) => {
    await expectAllRemoved(await apiAs('admin'), [
      ['GET', '/lut/list'],
      ['POST', '/lut/update', {}],
      ['GET', '/lut/feature/list'],
    ]);
  });

  test('TC-03 API gói và đơn gói đã bị xoá', { tag: '@regression' }, async ({ apiAs }) => {
    await expectAllRemoved(await apiAs('customer'), [
      ['GET', '/plan/public/list'],
      ['GET', '/subscription/my'],
      ['GET', '/order/my-list'],
      ['POST', '/order/create', {}],
    ]);
  });

  test('TC-04 API tải và bộ sưu tập đã bị xoá', { tag: '@regression' }, async ({ apiAs }) => {
    await expectAllRemoved(await apiAs('customer'), [
      ['POST', '/lut/download', { lutId: 1 }],
      ['GET', '/collection/my-list'],
      ['POST', '/collection/item/add', {}],
    ]);
  });

  test(
    'TC-05 API gợi ý, sở thích, dashboard đã bị xoá',
    { tag: '@regression' },
    async ({ apiAs }) => {
      await expectAllRemoved(await apiAs('admin'), [
        ['GET', '/recommend/public/for-you'],
        ['GET', '/recommend/config'],
        ['GET', '/recommend/eval/list'],
        ['GET', '/account/preference'],
        ['GET', '/dashboard/summary'],
      ]);
    }
  );

  test('TC-06 account/me không còn trường gói', { tag: '@smoke' }, async ({ apiAs }) => {
    const customer = await apiAs('customer');
    const me = await customer.client.expectOk(await customer.account.me());

    expect(me.email).toBe(accounts.customer.email);
    expect(me.roleName).toBe('Customer');
    expect(me).not.toHaveProperty('plan');
    expect(me).not.toHaveProperty('planExpiresAt');
    expect(me).not.toHaveProperty('planAutoRenew');
  });

  test('TC-07 account/me không token', { tag: '@regression' }, async ({ api }) => {
    await api.client.expectError(await api.account.me(), 401);
  });

  test('TC-08 đăng ký vẫn chạy', { tag: '@regression' }, async ({ api }) => {
    const email = uniqueEmail();
    const registered = await api.client.expectOk(
      await api.account.register({ name: 'Auto Test', email, plainPassword: 'Admin@123' })
    );
    expect(registered.token).toEqual(expect.any(String));
    expect(registered.refreshToken).toEqual(expect.any(String));

    const me = await api.client.expectOk(await api.useToken(registered.token).account.me());
    expect(me.email).toBe(email);
    expect(me.roleName).toBe('Customer');
  });

  test('TC-09 đăng nhập, refresh, phân quyền vẫn chạy', { tag: '@smoke' }, async ({ api }) => {
    const login = await api.auth.loginOk(accounts.admin);
    const refreshed = await api.client.expectOk(await api.auth.refresh(login.refreshToken));

    const roles = await api.client.expectOk(
      await api.useToken(refreshed.token).role.list({ limit: 200 })
    );
    expect(roles.items.map((/** @type {{ name: string }} */ r) => r.name)).toContain('Customer');
  });

  test(
    'TC-10 resource LUT, RECOMMEND, DASHBOARD đã biến mất',
    { tag: '@regression' },
    async ({ apiAs }) => {
      const admin = await apiAs('admin');
      const page = await admin.client.expectOk(await admin.resource.list());
      const codes = page.items.map((/** @type {{ code: string }} */ r) => r.code);

      expect(page.total).toBe(page.items.length);
      expect(codes).toEqual(expect.arrayContaining(['MODULE', 'RESOURCE', 'ROLE', 'PERMISSION']));
      for (const removed of ['LUT', 'RECOMMEND', 'DASHBOARD']) expect(codes).not.toContain(removed);
    }
  );

  test('TC-11 module LUT đã biến mất', { tag: '@regression' }, async ({ apiAs }) => {
    const admin = await apiAs('admin');
    const page = await admin.client.expectOk(await admin.resource.listModules());
    const codes = page.items.map((/** @type {{ code: string }} */ m) => m.code);

    expect(codes).toContain('SYSTEM');
    // CATALOG được lát du-lieu-giay thêm lại có chủ đích (go-lut §4), nên không còn trong danh sách phải vắng.
    for (const removed of ['RECOMMENDER', 'SALES']) expect(codes).not.toContain(removed);
  });
});
