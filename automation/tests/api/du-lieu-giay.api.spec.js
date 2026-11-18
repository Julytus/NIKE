import { accounts } from '../../data/accounts.js';
import { expectedSummary, seedProducts, sizesOf, stockOf } from '../../data/seed-products.js';
import { expect, test } from '../../fixtures/index.js';

/**
 * Lát `du-lieu-giay` (plan/du-lieu-giay.md §5, §9 TC-01 → TC-12): dữ liệu mẫu cửa hàng giày
 * và hai API hỗ trợ kiểm thử `test-support/summary`, `test-support/reset`.
 * Kết quả mong đợi tính từ `products.json` (data/seed-products.js), không ghi cứng số.
 */

const FORBIDDEN = 'Bạn không có quyền thực hiện thao tác này! Path: /test-support/';
const NOT_LOGGED_IN = 'Chưa đăng nhập';
const INVALID_TOKEN = 'Token không hợp lệ hoặc sai chữ ký';

/**
 * Bỏ các khoá không so được với `expectedSummary()`.
 * @param {Record<string, unknown>} summary
 */
function counts(summary) {
  const skipped = ['missingImages', 'sample', 'resetAt'];
  return Object.fromEntries(Object.entries(summary).filter(([k]) => !skipped.includes(k)));
}

test.describe('API test-support: summary', () => {
  test('TC-12 global-setup đã reset trước khi chạy', { tag: '@smoke' }, async ({ apiAs }) => {
    const admin = await apiAs('admin');
    const summary = await admin.client.expectOk(await admin.testSupport.summary());

    expect(counts(summary)).toEqual(expectedSummary());
    expect(summary.missingImages).toBe(0);
  });

  test('TC-01 summary: số lượng tổng', { tag: '@smoke' }, async ({ apiAs }) => {
    const admin = await apiAs('admin');
    const summary = await admin.client.expectOk(await admin.testSupport.summary());

    expect(summary).toMatchObject({
      categories: 5,
      products: 31,
      publishedProducts: 30,
      hiddenProducts: 1,
      images: 155,
      missingImages: 0,
    });
  });

  test('TC-02 summary: phân bố theo kế hoạch', { tag: '@regression' }, async ({ apiAs }) => {
    const admin = await apiAs('admin');
    const summary = await admin.client.expectOk(await admin.testSupport.summary());

    expect(summary.byCategory).toEqual({
      lifestyle: 12,
      'chay-bo': 6,
      'bong-ro': 5,
      jordan: 5,
      'bong-da': 2,
    });
    expect(summary.byGender).toEqual({ MEN: 12, WOMEN: 10, UNISEX: 4, BOYS: 2, GIRLS: 2 });
    expect(summary).toMatchObject({ onSale: 6, justIn: 8, bestseller: 5 });
  });

  test('TC-03 summary khớp products.json', { tag: '@regression' }, async ({ apiAs }) => {
    const admin = await apiAs('admin');
    const summary = await admin.client.expectOk(await admin.testSupport.summary());
    const expected = expectedSummary();

    for (const key of ['sizes', 'outOfStockSizes', 'totalStock']) {
      expect(summary[key], key).toBe(expected[/** @type {keyof typeof expected} */ (key)]);
    }
    expect(counts(summary)).toEqual(expected);
  });

  test(
    'TC-04 sản phẩm mẫu: ảnh truy cập được, size đúng thứ tự',
    { tag: '@smoke' },
    async ({ apiAs, request }) => {
      const admin = await apiAs('admin');
      const { sample } = await admin.client.expectOk(await admin.testSupport.summary());
      const first = seedProducts.find((p) => p.id === 1);
      expect(first).toBeTruthy();
      const product = /** @type {NonNullable<typeof first>} */ (first);

      expect(sample.id).toBe(1);
      expect(sample.slug).toBe(product.slug);
      expect(sample.imageUrls).toHaveLength(5);
      for (const [i, url] of sample.imageUrls.entries()) {
        expect(url).toMatch(new RegExp(`/products/${product.slug}/${i + 1}\\.webp$`));

        await test.step(`GET ${url}`, async () => {
          const res = await request.get(url);
          expect(res.status()).toBe(200);
          expect(res.headers()['content-type']).toBe('image/webp');
          expect((await res.body()).length).toBeGreaterThan(1024);
        });
      }

      expect(sample.sizes[0].id).toBe(101);
      const values = sample.sizes.map((/** @type {{ sizeValue: number }} */ s) => s.sizeValue);
      expect(values).toEqual([...values].sort((a, b) => a - b));
      for (const s of sample.sizes) expect(s.sizeLabel).not.toMatch(/\.0$/);
      expect(
        sample.sizes.map((/** @type {{ sizeLabel: string, sizeValue: number }} */ s) => ({
          sizeLabel: s.sizeLabel,
          sizeValue: s.sizeValue,
        }))
      ).toEqual(sizesOf(product.gender));
      expect(sample.sizes.map((/** @type {{ stock: number }} */ s) => s.stock)).toEqual(
        stockOf(product).map((s) => s.stock)
      );
      expect(sample.sizes.map((/** @type {{ id: number }} */ s) => s.id)).toEqual(
        sample.sizes.map((/** @type {unknown} */ _, /** @type {number} */ k) => 100 + k + 1)
      );
    }
  );
});

// Reset ghi lại toàn bộ bảng sản phẩm: chạy tuần tự trong một worker.
test.describe('API test-support: reset', () => {
  test.describe.configure({ mode: 'serial' });

  test('TC-05 reset trả về đúng dữ liệu ban đầu', { tag: '@smoke' }, async ({ apiAs }) => {
    const admin = await apiAs('admin');
    const reset = await admin.client.expectOk(await admin.testSupport.reset());

    expect(counts(reset)).toEqual(expectedSummary());
    expect(reset.missingImages).toBe(0);
    expect(reset.resetAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);

    const summary = await admin.client.expectOk(await admin.testSupport.summary());
    expect(counts(summary)).toEqual(counts(reset));
    expect(summary.missingImages).toBe(0);
  });

  test('TC-06 reset gọi lặp không lỗi, id ổn định', { tag: '@regression' }, async ({ apiAs }) => {
    const admin = await apiAs('admin');
    const first = await admin.client.expectOk(await admin.testSupport.reset());
    const second = await admin.client.expectOk(await admin.testSupport.reset());

    expect(counts(second)).toEqual(counts(first));
    expect(second.sample).toEqual(first.sample);
    for (const r of [first, second]) {
      expect(r.sample.id).toBe(1);
      expect(r.sample.sizes[0].id).toBe(101);
    }
  });

  test('TC-11 không có endpoint thừa ngoài hợp đồng', { tag: '@regression' }, async ({ apiAs }) => {
    const admin = await apiAs('admin');

    await test.step('POST /test-support/summary → 404 / 405', async () => {
      const res = await admin.client.post('/test-support/summary');
      expect([404, 405]).toContain(res.status());
    });

    await test.step('GET /test-support/reset → 404 / 405', async () => {
      const res = await admin.client.get('/test-support/reset');
      expect([404, 405]).toContain(res.status());
    });

    const summary = await admin.client.expectOk(await admin.testSupport.summary());
    expect(counts(summary)).toEqual(expectedSummary());
  });
});

test.describe('API test-support: phân quyền', () => {
  test('TC-07 không token / token sai', { tag: '@regression' }, async ({ api }) => {
    await test.step('không token', async () => {
      await api.client.expectError(await api.testSupport.summary(), 401, NOT_LOGGED_IN);
      await api.client.expectError(await api.testSupport.reset(), 401, NOT_LOGGED_IN);
    });

    await test.step('token sai', async () => {
      api.useToken('abc.def.ghi');
      await api.client.expectError(await api.testSupport.summary(), 401, INVALID_TOKEN);
      await api.client.expectError(await api.testSupport.reset(), 401, INVALID_TOKEN);
    });
  });

  test('TC-08 không phải operator', { tag: '@regression' }, async ({ apiAs }) => {
    for (const role of /** @type {const} */ (['noaccess', 'khach1'])) {
      await test.step(role, async () => {
        const user = await apiAs(role);
        await user.client.expectError(
          await user.testSupport.summary(),
          403,
          `${FORBIDDEN}, Action: VIEW`
        );
        await user.client.expectError(
          await user.testSupport.reset(),
          403,
          `${FORBIDDEN}, Action: UPDATE`
        );
      });
    }
  });
});

test.describe('Dữ liệu đi kèm: phân quyền và tài khoản khách', () => {
  test('TC-09 resource PRODUCT và module CATALOG', { tag: '@regression' }, async ({ apiAs }) => {
    const admin = await apiAs('admin');
    const resources = await admin.client.expectOk(await admin.resource.list());
    const modules = await admin.client.expectOk(await admin.resource.listModules());
    expect(resources.total).toBe(resources.items.length);

    const catalog = modules.items.find((/** @type {{ code: string }} */ m) => m.code === 'CATALOG');
    expect(catalog, 'module CATALOG').toBeTruthy();
    expect(catalog.name).toBe('Cửa hàng');

    const product = resources.items.find(
      (/** @type {{ code: string }} */ r) => r.code === 'PRODUCT'
    );
    expect(product, 'resource PRODUCT').toBeTruthy();
    expect(product).toMatchObject({ name: 'Quản lý sản phẩm', uri: '/product/' });
    expect(product.moduleId).toBe(catalog.id);
    expect(JSON.parse(product.actions)).toEqual(
      expect.arrayContaining(['VIEW', 'ADD', 'UPDATE', 'DELETE'])
    );

    const resourceCodes = resources.items.map((/** @type {{ code: string }} */ r) => r.code);
    for (const removed of ['LUT', 'RECOMMEND', 'DASHBOARD']) {
      expect(resourceCodes).not.toContain(removed);
    }
    const moduleCodes = modules.items.map((/** @type {{ code: string }} */ m) => m.code);
    for (const removed of ['RECOMMENDER', 'SALES']) expect(moduleCodes).not.toContain(removed);
  });

  test('TC-10 tài khoản khách test', { tag: '@smoke' }, async ({ api }) => {
    for (const [role, name] of /** @type {const} */ ([
      ['khach1', 'Khách Một'],
      ['khach2', 'Khách Hai'],
    ])) {
      await test.step(accounts[role].email, async () => {
        const login = await api.auth.loginOk(accounts[role]);
        expect(login.token).toEqual(expect.any(String));

        const me = await api.client.expectOk(await api.useToken(login.token).account.me());
        expect(me).toMatchObject({
          email: accounts[role].email,
          name,
          roleName: 'Khách hàng',
          isOperator: 0,
        });
        api.useToken(null);
      });
    }
  });
});
