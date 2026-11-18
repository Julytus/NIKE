import { accounts, WRONG_PASSWORD } from '../../data/accounts.js';
import registerInvalid from '../../data/register-invalid.json' with { type: 'json' };
import { expect, test } from '../../fixtures/index.js';
import { decodeJwt } from '../../utils/jwt.js';
import { uniqueEmail } from '../../utils/unique.js';

const SESSION_EXPIRED = 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại';

test.describe('API xác thực và đăng ký', () => {
  test(
    'TC-01 đăng nhập đúng trả token, refreshToken, userId',
    { tag: '@smoke' },
    async ({ api }) => {
      const result = await api.client.expectOk(await api.auth.login(accounts.admin));

      expect(result.token).toEqual(expect.any(String));
      expect(result.token.split('.')).toHaveLength(3);
      expect(result.refreshToken).toEqual(expect.any(String));
      expect(result.userId).toBeGreaterThan(0);
    }
  );

  test('TC-02 đăng nhập sai mật khẩu', { tag: '@regression' }, async ({ api }) => {
    const res = await api.auth.login({ email: accounts.admin.email, password: WRONG_PASSWORD });

    await api.client.expectError(res, 400, 'Tài khoản hoặc mật khẩu không đúng.');
  });

  test(
    'TC-03 refresh cấp phiên mới, logout thu hồi refresh token',
    { tag: '@smoke' },
    async ({ api }) => {
      const login = await api.auth.loginOk(accounts.admin);

      const refreshed = await api.client.expectOk(await api.auth.refresh(login.refreshToken));
      expect(refreshed.token).toEqual(expect.any(String));
      expect(refreshed.refreshToken).not.toBe(login.refreshToken);
      // Token mới dùng được
      await api.client.expectOk(await api.useToken(refreshed.token).account.me());

      await api.client.expectOk(await api.auth.logout(refreshed.refreshToken));
      const reuse = await api.auth.refresh(refreshed.refreshToken);
      await api.client.expectError(reuse, 401, SESSION_EXPIRED);
    }
  );

  test('TC-04 refresh token rác', { tag: '@regression' }, async ({ api }) => {
    await api.client.expectError(await api.auth.refresh('abc'), 401, SESSION_EXPIRED);
  });

  test(
    'TC-05 đăng ký thành công rồi xem account/me',
    { tag: '@regression' },
    async ({ api, apiAs }) => {
      const email = uniqueEmail();
      const name = 'Khách Tự Động';

      const registered = await api.client.expectOk(
        await api.account.register({ name, email, plainPassword: 'Abc@12345' })
      );
      expect(registered.token).toEqual(expect.any(String));

      const me = await api.client.expectOk(await api.useToken(registered.token).account.me());
      expect(me.email).toBe(email);
      expect(me.name).toBe(name);

      // account/me không trả tên chức vụ: đối chiếu roleId trong token với chức vụ "Khách hàng"
      const admin = await apiAs('admin');
      const customerRole = await admin.role.findByName('Khách hàng');
      expect(customerRole, 'phải có chức vụ "Khách hàng"').toBeTruthy();
      expect(decodeJwt(registered.token).user.roleId).toBe(customerRole.id);
    }
  );

  for (const row of registerInvalid) {
    test(`${row.id} đăng ký sai: ${row.case}`, { tag: '@regression' }, async ({ api }) => {
      const body = {
        ...row.body,
        email: row.body.email === '{unique}' ? uniqueEmail() : row.body.email,
      };

      await api.client.expectError(await api.account.register(body), row.status, row.message);
    });
  }

  test('TC-10 gọi account/me không có token', { tag: '@regression' }, async ({ api }) => {
    await api.client.expectError(await api.account.me(), 401);
  });
});
