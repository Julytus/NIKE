import { accountNames, accounts, seedRoleNames, WRONG_PASSWORD } from '../../data/accounts.js';
import registerInvalid from '../../data/register-invalid.json' with { type: 'json' };
import { expectedNewArrivals, expectedSuggest } from '../../data/seed-products.js';
import { expect, test } from '../../fixtures/index.js';
import { uniqueEmail } from '../../utils/unique.js';
import { findVietnamese, VIETNAMESE_RE } from '../../utils/vietnamese.js';

/**
 * Lát `tieng-anh-cua-hang` (plan/tieng-anh-cua-hang.md §4, §5, §9 TC-01 → TC-09): dữ liệu danh mục / phụ đề /
 * tên tài khoản / chức vụ / module / tài nguyên và mọi message lỗi API trả về tiếng Anh.
 * global-setup đã `test-support/reset` trước khi chạy; kết quả mong đợi tính từ `products.json`.
 */

const FORBIDDEN_PREFIX = "You don't have permission to perform this action.";

/** @typedef {{ id: number, slug: string, subtitle: string }} Card */

/**
 * Khẳng định message không còn chữ có dấu tiếng Việt.
 * @param {unknown} message
 * @param {string} where
 */
function expectEnglish(message, where) {
  expect(findVietnamese(String(message ?? '')), `${where}: "${message}"`).toEqual([]);
}

test.describe('API dữ liệu tiếng Anh', () => {
  test('TC-01 danh mục tiếng Anh', { tag: '@smoke' }, async ({ api }) => {
    const result = await api.client.expectOk(await api.product.categories());

    expect(
      result.map((/** @type {{ slug: string, name: string }} */ c) => [c.slug, c.name])
    ).toEqual([
      ['lifestyle', 'Lifestyle'],
      ['running', 'Running'],
      ['basketball', 'Basketball'],
      ['jordan', 'Jordan'],
      ['football', 'Football'],
    ]);
    expect(result.map((/** @type {{ productCount: number }} */ c) => c.productCount)).toEqual([
      12, 6, 5, 5, 2,
    ]);
  });

  test('TC-02 phụ đề tiếng Anh', { tag: '@smoke' }, async ({ api }) => {
    const arrivals = await api.client.expectOk(await api.product.newArrivals());
    const suggest = await api.client.expectOk(await api.product.suggest('nike'));

    /** @param {Card[]} cards */
    const pick = (cards) => cards.map((c) => ({ id: c.id, subtitle: c.subtitle }));
    expect(pick(arrivals)).toEqual(pick(expectedNewArrivals()));
    expect(pick(suggest.items)).toEqual(pick(expectedSuggest('nike').items));

    for (const card of /** @type {Card[]} */ ([...arrivals, ...suggest.items])) {
      expect(card.subtitle, `subtitle của id ${card.id}`).not.toMatch(VIETNAMESE_RE);
    }
    const byId = new Map(arrivals.map((/** @type {Card} */ c) => [c.id, c.subtitle]));
    expect(byId.get(2)).toBe("Men's Shoes");
    expect(byId.get(14)).toBe("Men's Road Racing Shoes");
    expect(byId.get(23)).toBe("Girls' Basketball Shoes");
  });

  // Data-driven: từ khoá tiếng Anh tìm theo phụ đề mới; chữ tiếng Việt cũ không còn khớp.
  for (const { q, total, ids } of [
    { q: 'basketball shoes', total: 5, ids: [19, 20, 21, 22, 23] },
    { q: 'slides', total: 5, ids: [3, 6, 10, 12, 28] },
    { q: 'giày bóng rổ', total: 0, ids: [] },
    { q: '  Basketball Shoes  ', total: 5, ids: [19, 20, 21, 22, 23] },
  ]) {
    test(
      `TC-03 tìm theo từ khoá tiếng Anh: ${JSON.stringify(q)}`,
      { tag: '@regression' },
      async ({ api }) => {
        const result = await api.client.expectOk(await api.product.suggest(q));
        const expected = expectedSuggest(q);

        expect(result.total).toBe(total);
        expect(expected.total).toBe(total);
        expect(result.items.map((/** @type {Card} */ c) => c.id).sort((a, b) => a - b)).toEqual(
          ids
        );
        expect(
          result.items.map((/** @type {Card} */ c) => ({ id: c.id, subtitle: c.subtitle }))
        ).toEqual(expected.items.map((c) => ({ id: c.id, subtitle: c.subtitle })));
      }
    );
  }

  test('TC-07 tên tài khoản test tiếng Anh', { tag: '@smoke' }, async ({ apiAs }) => {
    for (const role of /** @type {const} */ (['customer', 'khach1', 'khach2'])) {
      await test.step(accounts[role].email, async () => {
        const user = await apiAs(role);
        const me = await user.client.expectOk(await user.account.me());
        expect(me.name).toBe(accountNames[role]);
        expect(me.roleName).toBe(seedRoleNames.customer);
      });
    }
  });

  test(
    'TC-08 tên chức vụ / module / tài nguyên tiếng Anh',
    { tag: '@regression' },
    async ({ apiAs }) => {
      const admin = await apiAs('admin');
      const roles = await admin.client.expectOk(await admin.role.list({ limit: 200 }));
      const modules = await admin.client.expectOk(await admin.resource.listModules());
      const resources = await admin.client.expectOk(await admin.resource.list());

      const roleNames = roles.items.map((/** @type {{ name: string }} */ r) => r.name);
      expect(roleNames).toEqual(expect.arrayContaining(Object.values(seedRoleNames)));

      /** @type {[{ items: { code: string, name: string, description: string | null }[] }, Record<string, string>][]} */
      const groups = [
        [modules, { SYSTEM: 'System', CATALOG: 'Store' }],
        [
          resources,
          {
            MODULE: 'Module Management',
            RESOURCE: 'Resource Management',
            ROLE: 'Role Management',
            PERMISSION: 'Permissions',
            PRODUCT: 'Product Management',
          },
        ],
      ];
      for (const [page, expectedNames] of groups) {
        for (const [code, name] of Object.entries(expectedNames)) {
          const row = page.items.find((r) => r.code === code);
          expect(row, `có ${code}`).toBeTruthy();
          expect(row?.name, code).toBe(name);
          expectEnglish(row?.name, `${code}.name`);
          expectEnglish(row?.description, `${code}.description`);
        }
      }
    }
  );
});

test.describe('API message lỗi tiếng Anh', () => {
  for (const row of registerInvalid) {
    test(`TC-04 đăng ký sai: ${row.case}`, { tag: '@regression' }, async ({ api }) => {
      const body = {
        ...row.body,
        email: row.body.email === '{unique}' ? uniqueEmail() : row.body.email,
      };
      const error = await api.client.expectError(
        await api.account.register(body),
        row.status,
        row.message
      );
      expectEnglish(error.message, row.case);
    });
  }

  /**
   * TC-05 data-driven: mỗi dòng gọi một API và kiểm HTTP + message (bằng hoặc bắt đầu bằng).
   * @type {{ case: string, call: (fx: { api: import('../../api/index.js').Api, apiAs: (r: 'admin' | 'noaccess') => Promise<import('../../api/index.js').Api> }) => Promise<import('@playwright/test').APIResponse>, status: number, message?: string, startsWith?: string }[]}
   */
  const frameworkErrors = [
    {
      case: '(a) đăng nhập sai mật khẩu',
      call: ({ api }) =>
        api.auth.login({ email: accounts.customer.email, password: WRONG_PASSWORD }),
      status: 400,
      message: 'Incorrect email or password.',
    },
    {
      case: '(b) account/me không token',
      call: ({ api }) => api.account.me(),
      status: 401,
      message: 'Please sign in',
    },
    {
      case: '(c) token sai chữ ký',
      call: async ({ api }) => {
        const { token } = await api.auth.loginOk(accounts.customer);
        const [header, payload, signature] = token.split('.');
        const flipped = signature.startsWith('A')
          ? `B${signature.slice(1)}`
          : `A${signature.slice(1)}`;
        return api.useToken(`${header}.${payload}.${flipped}`).account.me();
      },
      status: 401,
      message: 'Invalid or tampered token',
    },
    {
      case: '(d) noaccess gọi role/list',
      call: async ({ apiAs }) => (await apiAs('noaccess')).role.list(),
      status: 403,
      startsWith: FORBIDDEN_PREFIX,
    },
    {
      case: '(e) sai method',
      call: ({ api }) => api.client.post('/product/public/suggest'),
      status: 405,
      message: 'HTTP method not supported',
    },
    {
      case: '(f) sai đường dẫn',
      call: ({ api }) => api.client.get('/product/public/khong-ton-tai'),
      status: 404,
      message: 'API not found',
    },
  ];

  for (const row of frameworkErrors) {
    test(
      `TC-05 lỗi xác thực / quyền / khung: ${row.case}`,
      { tag: '@regression' },
      async ({ api, apiAs }) => {
        const error = await api.client.expectError(
          await row.call({ api, apiAs }),
          row.status,
          row.message
        );
        if (row.startsWith)
          expect(String(error.message)).toMatch(new RegExp(`^${escape(row.startsWith)}`));
        expectEnglish(error.message, row.case);
      }
    );
  }

  test('TC-06 không tìm thấy dữ liệu', { tag: '@regression' }, async ({ apiAs }) => {
    const admin = await apiAs('admin');
    await admin.client.expectError(await admin.role.get(999999), 404, 'Not found');
  });

  test(
    'TC-09 lỗi nghiệp vụ quản trị tiếng Anh (data-driven)',
    { tag: '@regression' },
    async ({ apiAs }) => {
      const admin = await apiAs('admin');
      const adminRole = await admin.role.findByName(seedRoleNames.admin);
      expect(adminRole, `chức vụ "${seedRoleNames.admin}"`).toBeTruthy();
      const resources = await admin.client.expectOk(await admin.resource.list());
      const roleResource = resources.items.find(
        (/** @type {{ code: string }} */ r) => r.code === 'ROLE'
      );
      expect(roleResource, 'tài nguyên ROLE').toBeTruthy();

      /** @type {[string, () => Promise<import('@playwright/test').APIResponse>, string][]} */
      const cases = [
        [
          '(a) tạo chức vụ trùng tên',
          () => admin.role.update({ name: seedRoleNames.admin }),
          'Role name already exists',
        ],
        [
          '(b) xoá chức vụ đang gán cho tài khoản',
          () => admin.role.delete(adminRole.id),
          "This role is assigned to accounts and can't be deleted",
        ],
        [
          '(c) tạo module trùng code',
          () => admin.resource.updateModule({ name: 'Duplicate Module', code: 'SYSTEM' }),
          'Module code already exists',
        ],
        [
          '(d) tạo tài nguyên trùng code',
          () =>
            admin.resource.update({
              name: 'Duplicate Resource',
              code: 'ROLE',
              uri: '/duplicate-role/',
              actions: '["VIEW"]',
            }),
          'Resource code already exists',
        ],
        [
          '(e) xoá tài nguyên hệ thống',
          () => admin.resource.delete(roleResource.id),
          "System resources can't be deleted",
        ],
      ];

      for (const [name, call, message] of cases) {
        await test.step(name, async () => {
          await admin.client.expectError(await call(), 400, message);
        });
      }
    }
  );
});

/** Thoát ký tự đặc biệt của regex. @param {string} s */
function escape(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
