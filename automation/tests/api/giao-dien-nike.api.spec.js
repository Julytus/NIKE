import { createApi } from '../../api/index.js';
import {
  expectedCategories,
  expectedNewArrivals,
  expectedSuggest,
  imageSuffixOf,
  seedProducts,
} from '../../data/seed-products.js';
import { expect, test } from '../../fixtures/index.js';

/**
 * Lát `giao-dien-nike` (plan/giao-dien-nike.md §5, §9 TC-01 → TC-09): 3 API công khai của cửa hàng —
 * danh mục, "Mới về", gợi ý tìm kiếm. Kết quả mong đợi tính từ `products.json` (data/seed-products.js).
 * global-setup đã `test-support/reset` trước khi chạy.
 */

const METHOD_NOT_ALLOWED = 'Phương thức HTTP không được hỗ trợ';
const API_NOT_FOUND = 'Không tìm thấy API';
const INVALID_TOKEN = 'abc.def.ghi';

/**
 * Bỏ các field không so trực tiếp (`imageUrl` kiểm theo đuôi, field POJO không chọn có thể null).
 * @param {Record<string, unknown>} card
 */
const comparable = (card) => ({
  id: card.id,
  slug: card.slug,
  styleCode: card.styleCode,
  name: card.name,
  subtitle: card.subtitle,
  gender: card.gender,
  price: card.price,
  salePrice: card.salePrice,
  badge: card.badge,
  totalStock: card.totalStock,
});

/**
 * So kết quả suggest với `expectedSuggest(q)`.
 * @param {{ total: number, page: number, items: Record<string, unknown>[] }} result
 * @param {string} q
 */
function expectSuggestMatches(result, q) {
  const expected = expectedSuggest(q);
  expect(result.total, `total cho "${q}"`).toBe(expected.total);
  expect(result.page).toBe(1);
  expect(result.items.map(comparable), `items cho "${q}"`).toEqual(expected.items);
  for (const item of result.items) {
    expect(String(item.imageUrl)).toMatch(new RegExp(`${imageSuffixOf(String(item.slug))}$`));
  }
}

test.describe('API danh mục công khai', () => {
  test(
    'TC-01 danh mục: thứ tự, số sản phẩm đang bán, ảnh đại diện',
    { tag: '@smoke' },
    async ({ api, request }) => {
      const result = await api.client.expectOk(await api.product.categories());
      const expected = expectedCategories();

      expect(result.map((/** @type {any} */ c) => c.slug)).toEqual([
        'lifestyle',
        'chay-bo',
        'bong-ro',
        'jordan',
        'bong-da',
      ]);
      expect(result.map((/** @type {any} */ c) => c.name)).toEqual([
        'Lifestyle',
        'Chạy bộ',
        'Bóng rổ',
        'Jordan',
        'Bóng đá',
      ]);
      expect(result.map((/** @type {any} */ c) => c.productCount)).toEqual([12, 6, 5, 5, 2]);

      expect(result).toHaveLength(expected.length);
      for (const [i, category] of result.entries()) {
        const exp = expected[i];
        expect(category).toMatchObject({
          id: exp.id,
          slug: exp.slug,
          name: exp.name,
          sortOrder: exp.sortOrder,
          productCount: exp.productCount,
        });
        expect(exp.imageSlug, `${exp.slug} có sản phẩm đang bán`).not.toBeNull();
        expect(category.imageUrl).toMatch(
          new RegExp(`${imageSuffixOf(/** @type {string} */ (exp.imageSlug))}$`)
        );
        const image = await request.get(category.imageUrl);
        expect(image.status(), category.imageUrl).toBe(200);
        expect(image.headers()['content-type']).toBe('image/webp');
      }
      expect(result[0].imageUrl).toMatch(/\/products\/nike-dunk-low-retro\/1\.webp$/);
    }
  );
});

test.describe('API "Mới về"', () => {
  test('TC-02 mới về: JUST_IN đang bán, mới nhất trước', { tag: '@smoke' }, async ({ api }) => {
    const result = await api.client.expectOk(await api.product.newArrivals());
    const expected = expectedNewArrivals();

    expect(result.map((/** @type {any} */ p) => p.id)).toEqual([2, 5, 14, 20, 23, 24, 25, 26]);
    expect(result.map(comparable)).toEqual(expected);
    for (const p of result) {
      expect(p.badge).toBe('JUST_IN');
      expect(p.imageUrl).toMatch(new RegExp(`${imageSuffixOf(p.slug)}$`));
    }
    expect(result[0].totalStock).toBe(220);
  });
});

test.describe('API gợi ý tìm kiếm', () => {
  test('TC-03 tối đa 6 + tổng + thứ tự', { tag: '@smoke' }, async ({ api }) => {
    const result = await api.client.expectOk(await api.product.suggest('nike'));

    expect(result.total).toBe(22);
    expect(result.items.map((/** @type {any} */ p) => p.id)).toEqual([2, 5, 14, 30, 29, 22]);
    expect(result.items.map((/** @type {any} */ p) => p.id)).not.toContain(31);
    expectSuggestMatches(result, 'nike');
  });

  test(
    'TC-04 không phân biệt hoa thường / dấu, tìm cả phụ đề',
    { tag: '@regression' },
    async ({ api }) => {
      for (const q of ['GIAY BONG RO', 'giày bóng rổ']) {
        await test.step(q, async () => {
          const result = await api.client.expectOk(await api.product.suggest(q));
          expect(result.total).toBe(5);
          expect(result.items.map((/** @type {any} */ p) => p.id)).toEqual([20, 23, 22, 21, 19]);
          expectSuggestMatches(result, q);
        });
      }
    }
  );

  test('TC-05 theo mã sản phẩm + giá giảm', { tag: '@regression' }, async ({ api }) => {
    const byCode = await api.client.expectOk(await api.product.suggest('CW2288'));
    expect(byCode.total).toBe(1);
    expect(byCode.items[0]).toMatchObject({ id: 1, name: "Nike Air Force 1 '07" });
    expectSuggestMatches(byCode, 'CW2288');

    const mule = await api.client.expectOk(await api.product.suggest('mule'));
    expect(mule.items).toHaveLength(1);
    expect(mule.items[0]).toMatchObject({
      id: 27,
      price: 4699000,
      salePrice: 3759000,
      badge: null,
    });
    expectSuggestMatches(mule, 'mule');
  });

  test('TC-06 sản phẩm ẩn không xuất hiện', { tag: '@regression' }, async ({ api }) => {
    const hidden = seedProducts.find((p) => p.status === 'HIDDEN');
    expect(hidden?.id).toBe(31);

    const airMax = await api.client.expectOk(await api.product.suggest('air max'));
    expect(airMax.total).toBe(2);
    expect(airMax.items.map((/** @type {any} */ p) => p.id)).toEqual([5, 8]);

    const onlyHidden = await api.client.expectOk(await api.product.suggest('air max plus'));
    expect(onlyHidden).toEqual({ total: 0, page: 1, items: [] });
  });

  test('TC-07 từ khoá rỗng / ký tự đặc biệt', { tag: '@regression' }, async ({ api }) => {
    const empty = { total: 0, page: 1, items: [] };
    for (const q of [undefined, '', '  ', '%', '_']) {
      await test.step(`q=${JSON.stringify(q)}`, async () => {
        const result = await api.client.expectOk(await api.product.suggest(q));
        expect(result).toEqual(empty);
      });
    }

    const injection = await api.client.expectOk(await api.product.suggest("' OR 1=1 --"));
    expect(injection.total).toBe(0);
    expect(injection.items).toEqual([]);

    const quote = await api.client.expectOk(await api.product.suggest("a'two"));
    expect(quote.total).toBe(1);
    expect(quote.items[0].id).toBe(21);
  });
});

test.describe('API công khai: token và lỗi khung', () => {
  test('TC-08 token sai vẫn đọc được', { tag: '@regression' }, async ({ api, request }) => {
    const anonymous = {
      categories: await api.client.expectOk(await api.product.categories()),
      newArrivals: await api.client.expectOk(await api.product.newArrivals()),
      suggest: await api.client.expectOk(await api.product.suggest('jordan')),
    };

    const bad = createApi(request, INVALID_TOKEN);
    expect(await bad.client.expectOk(await bad.product.categories())).toEqual(anonymous.categories);
    expect(await bad.client.expectOk(await bad.product.newArrivals())).toEqual(
      anonymous.newArrivals
    );
    expect(await bad.client.expectOk(await bad.product.suggest('jordan'))).toEqual(
      anonymous.suggest
    );
  });

  test('TC-09 sai method / sai đường dẫn', { tag: '@regression' }, async ({ api }) => {
    for (const path of [
      '/product-category/public/list',
      '/product/public/new-arrivals',
      '/product/public/suggest',
    ]) {
      await test.step(`POST ${path}`, async () => {
        await api.client.expectError(await api.client.post(path), 405, METHOD_NOT_ALLOWED);
      });
    }
    await api.client.expectError(
      await api.client.get('/product/public/khong-ton-tai'),
      404,
      API_NOT_FOUND
    );
  });
});
