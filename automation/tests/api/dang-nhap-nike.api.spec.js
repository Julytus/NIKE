import { accounts } from '../../data/accounts.js';
import checkEmailInvalid from '../../data/check-email-invalid.json' with { type: 'json' };
import { createApi } from '../../api/index.js';
import { expect, test } from '../../fixtures/index.js';
import { uniqueEmail } from '../../utils/unique.js';

/**
 * Lát `dang-nhap-nike` (plan/dang-nhap-nike.md §5, §9 TC-01 → TC-06): `POST /account/public/check-email`
 * công khai, chuẩn hoá trim + chữ thường, validate theo §5.4, khớp với đăng ký / đăng nhập.
 */

const KHACH1 = accounts.khach1.email;

test.describe('API check-email', () => {
  test('TC-01 email đã có tài khoản', { tag: '@smoke' }, async ({ api }) => {
    const result = await api.client.expectOk(await api.account.checkEmail({ email: KHACH1 }));

    expect(result).toEqual({ email: KHACH1, exists: true });
  });

  test('TC-02 email chưa có tài khoản', { tag: '@regression' }, async ({ api }) => {
    const email = uniqueEmail();

    const result = await api.client.expectOk(
      await api.account.checkEmail({ email: email.toUpperCase() })
    );

    expect(result).toEqual({ email: email.toLowerCase(), exists: false });
  });

  test('TC-03 chuẩn hoá trim + chữ thường', { tag: '@regression' }, async ({ api }) => {
    const result = await api.client.expectOk(
      await api.account.checkEmail({ email: '  KHACH1@nike.Local  ' })
    );

    expect(result).toEqual({ email: KHACH1, exists: true });
  });

  for (const c of checkEmailInvalid) {
    test(`TC-04 validate: ${c.case}`, { tag: '@regression' }, async ({ api }) => {
      await api.client.expectError(await api.account.checkEmail(c.body), c.status, c.message);
    });
  }

  test('TC-05 công khai: token sai vẫn dùng được', { tag: '@regression' }, async ({ request }) => {
    const api = createApi(request, 'abc.def.ghi');

    const result = await api.client.expectOk(await api.account.checkEmail({ email: KHACH1 }));

    expect(result).toEqual({ email: KHACH1, exists: true });
  });

  test('TC-06 khớp với đăng ký / đăng nhập', { tag: '@smoke' }, async ({ api }) => {
    const email = uniqueEmail();
    const password = 'Abc12345';

    const before = await api.client.expectOk(await api.account.checkEmail({ email }));
    expect(before.exists).toBe(false);

    await api.client.expectOk(
      await api.account.register({ name: 'Join Test', email, plainPassword: password })
    );

    const after = await api.client.expectOk(await api.account.checkEmail({ email }));
    expect(after).toEqual({ email, exists: true });

    const login = await api.auth.loginOk({ email, password });
    expect(login.token).toBeTruthy();
  });
});
