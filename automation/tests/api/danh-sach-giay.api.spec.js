import { createApi } from '../../api/index.js';
import cases from '../../data/catalog-filters.json' with { type: 'json' };
import {
  CATALOG_MAX_LIMIT,
  cardOf,
  expectedFacets,
  expectedList,
  imageSuffixOf,
  seedCategories,
  seedProducts,
  sellingPrice,
} from '../../data/seed-products.js';
import { expect, test } from '../../fixtures/index.js';

/**
 * Lát `danh-sach-giay` (plan/danh-sach-giay.md §5, §9 TC-01 → TC-13): `GET /product/public/list`
 * (lọc + sắp xếp + phân trang) và `GET /product/public/facets` (đếm theo từng lựa chọn lọc), công khai.
 * Kết quả mong đợi tính từ `products.json` bằng `expectedList` / `expectedFacets` (data/seed-products.js).
 * global-setup đã `test-support/reset` trước khi chạy.
 */

const CATEGORY_NOT_FOUND = 'Category not found';
const METHOD_NOT_ALLOWED = 'HTTP method not supported';
const INVALID_TOKEN = 'abc.def.ghi';
const HIDDEN_ID = 31;
const SOLD_OUT_ID = 9;

/** @typedef {import('../../data/seed-products.js').CatalogFilter} CatalogFilter */
/** @typedef {{ total: number, page: number, items: Record<string, any>[] }} PageResult */

/** id danh mục theo slug trong dữ liệu mẫu. */
const categoryIdOf = Object.fromEntries(seedCategories.map((c) => [c.slug, c.id]));
const productById = new Map(seedProducts.map((p) => [p.id, p]));

/**
 * Thẻ mong đợi đủ 13 field §5.1 (trừ `imageUrl` kiểm theo đuôi).
 * @param {number} id
 */
function fullCardOf(id) {
  const p = /** @type {import('../../data/seed-products.js').SeedProduct} */ (productById.get(id));
  return { ...cardOf(p), categoryId: categoryIdOf[p.category], createdTime: p.createdTime };
}

/** @param {Record<string, any>} card */
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
  categoryId: card.categoryId,
  createdTime: card.createdTime,
});

/** @param {PageResult} result */
const idsOf = (result) => result.items.map((i) => i.id);

/**
 * So từng thẻ với dữ liệu mẫu (13 field + đuôi ảnh), không có sản phẩm ẩn.
 * @param {PageResult} result
 */
function expectCards(result) {
  expect(result.items.map(comparable)).toEqual(idsOf(result).map(fullCardOf));
  for (const item of result.items) {
    expect(String(item.imageUrl)).toMatch(new RegExp(`${imageSuffixOf(String(item.slug))}$`));
  }
  expect(idsOf(result)).not.toContain(HIDDEN_ID);
}

/**
 * Gọi `list` với `limit=48` và so với `expectedList(filter)`.
 * @param {import('../../api/index.js').Api} api
 * @param {CatalogFilter} filter
 */
async function expectListMatches(api, filter) {
  const result = /** @type {PageResult} */ (
    await api.client.expectOk(await api.product.list({ ...filter, limit: CATALOG_MAX_LIMIT }))
  );
  const expected = expectedList(filter, { limit: CATALOG_MAX_LIMIT });
  expect(result.total, `total cho ${JSON.stringify(filter)}`).toBe(expected.total);
  expect(result.page).toBe(1);
  expect(idsOf(result), `id cho ${JSON.stringify(filter)}`).toEqual(
    expected.items.map((i) => i.id)
  );
  expect(idsOf(result)).not.toContain(HIDDEN_ID);
  return result;
}

/**
 * Chuẩn hoá facets để so: `size.value` về số (42 hay 42.0 đều được).
 * @param {Record<string, any>} facets
 */
const normalizeFacets = (facets) => ({
  ...facets,
  size: facets.size.map((/** @type {any} */ s) => ({ ...s, value: Number(s.value) })),
});

test.describe('API danh sách giày: mặc định, phân trang, sắp xếp', () => {
  test('TC-01 danh sách mặc định', { tag: '@smoke' }, async ({ api }) => {
    const result = /** @type {PageResult} */ (await api.client.expectOk(await api.product.list()));
    expect(result.total).toBe(30);
    expect(result.page).toBe(1);
    expect(idsOf(result)).toEqual([2, 5, 14, 20, 23, 24, 25, 26, 22, 8, 15, 1]);
    expect(idsOf(result)).toEqual(expectedList({}).items.map((i) => i.id));
    expectCards(result);
  });

  test('TC-02 phân trang', { tag: '@regression' }, async ({ api }) => {
    const pages = [];
    for (const page of [1, 2, 3, 4]) {
      pages.push(
        /** @type {PageResult} */ (await api.client.expectOk(await api.product.list({ page })))
      );
    }
    for (const [i, p] of pages.entries()) {
      expect(p.total).toBe(30);
      expect(p.page).toBe(i + 1);
    }
    expect(idsOf(pages[1])).toEqual([3, 30, 29, 27, 21, 18, 17, 16, 11, 7, 4, 13]);
    expect(idsOf(pages[2])).toEqual([19, 12, 10, 28, 6, 9]);
    expect(pages[3].items).toEqual([]);

    const all = pages.flatMap(idsOf);
    expect(new Set(all).size).toBe(30);
    expect(all).toEqual(expectedList({}, { limit: CATALOG_MAX_LIMIT }).items.map((i) => i.id));
    expect(all.at(-1)).toBe(SOLD_OUT_ID);
    for (const p of pages.slice(0, 3)) expectCards(p);
  });

  /**
   * Kiểm riêng từng kiểu sắp xếp (ngoài việc khớp `expectedList`).
   * @type {Record<string, (ids: number[], prices: number[]) => void>}
   */
  const sortChecks = {
    featured: (ids) => {
      expect(ids.slice(0, 3)).toEqual([2, 5, 14]);
      expect(ids.at(-1)).toBe(SOLD_OUT_ID);
    },
    newest: (ids) => {
      expect(ids.slice(0, 3)).toEqual([2, 5, 14]);
      expect(ids.at(-1)).toBe(3);
    },
    'price-desc': (ids, prices) => {
      expect(ids.slice(0, 3)).toEqual([14, 29, 18]);
      expect(prices[0]).toBe(8_059_000);
      expect(prices).toEqual([...prices].sort((a, b) => b - a));
    },
    'price-asc': (ids, prices) => {
      expect(ids.slice(0, 4)).toEqual([3, 12, 10, 28]);
      expect(prices.slice(0, 4)).toEqual([769_000, 815_000, 889_000, 889_000]);
      // id 19 giảm còn 2.000.000 đứng trước id 4 (2.119.000)
      expect(ids.indexOf(19)).toBeLessThan(ids.indexOf(4));
      expect(prices).toEqual([...prices].sort((a, b) => a - b));
    },
  };

  for (const [sort, check] of Object.entries(sortChecks)) {
    test(`TC-03 sắp xếp: ${sort}`, { tag: '@regression' }, async ({ api }) => {
      const result = await expectListMatches(api, { sort });
      expect(result.total).toBe(30);
      check(
        idsOf(result),
        result.items.map((i) => i.salePrice ?? i.price)
      );
    });
  }
});

test.describe('API danh sách giày: bộ lọc', () => {
  for (const c of cases.single) {
    test(`TC-04${c.id} lọc một nhóm: ${c.case}`, { tag: '@regression' }, async ({ api }) => {
      expect(expectedList(c.filter).total, 'dữ liệu mẫu đổi so với catalog-filters.json').toBe(
        c.total
      );
      const result = await expectListMatches(api, c.filter);
      expect(result.total).toBe(c.total);
      expect(idsOf(result)).toEqual(c.ids);
    });
  }

  test('TC-04q biên khoảng giá (giá đang bán)', { tag: '@regression' }, async ({ api }) => {
    /** @param {string} price */
    const idsIn = async (price) =>
      idsOf(await api.client.expectOk(await api.product.list({ price, limit: CATALOG_MAX_LIMIT })));
    const under = await idsIn('under-1m');
    const low = await idsIn('1m-2m');
    const mid = await idsIn('2m-5m');
    const high = await idsIn('5m-plus');

    // id 6 đúng 1.000.000; id 19 giá giảm đúng 2.000.000; id 25 4.999.000; id 17 đúng 5.000.000
    expect(sellingPrice(/** @type {any} */ (productById.get(6)))).toBe(1_000_000);
    expect(sellingPrice(/** @type {any} */ (productById.get(19)))).toBe(2_000_000);
    expect(sellingPrice(/** @type {any} */ (productById.get(25)))).toBe(4_999_000);
    expect(sellingPrice(/** @type {any} */ (productById.get(17)))).toBe(5_000_000);
    expect(low).toContain(6);
    expect(under).not.toContain(6);
    expect(low).toContain(19);
    expect(mid).not.toContain(19);
    expect(mid).toContain(25);
    expect(high).toContain(17);
    expect(mid).not.toContain(17);
    // 4 khoảng không chồng nhau, phủ đủ 30 sản phẩm
    expect(new Set([...under, ...low, ...mid, ...high]).size).toBe(30);
    expect(under.length + low.length + mid.length + high.length).toBe(30);
  });

  for (const c of cases.combined) {
    test(`TC-05${c.id} kết hợp nhóm: ${c.case}`, { tag: '@regression' }, async ({ api }) => {
      expect(expectedList(c.filter).total, 'dữ liệu mẫu đổi so với catalog-filters.json').toBe(
        c.total
      );
      const result = await expectListMatches(api, c.filter);
      expect(result.total).toBe(c.total);
      expect(idsOf(result)).toEqual(c.ids);
    });
  }

  for (const c of cases.size) {
    test(`TC-06${c.id} lọc size còn hàng: ${c.case}`, { tag: '@regression' }, async ({ api }) => {
      expect(expectedList(c.filter).total, 'dữ liệu mẫu đổi so với catalog-filters.json').toBe(
        c.total
      );
      const result = await expectListMatches(api, c.filter);
      expect(result.total).toBe(c.total);
      const ids = idsOf(result);
      expect(ids).toEqual(expect.arrayContaining(c.contains));
      expect(ids.filter((id) => c.excludes.includes(id))).toEqual([]);
    });
  }

  test('TC-07 tham số lạ bị bỏ qua, không lỗi', { tag: '@regression' }, async ({ api }) => {
    const men = /** @type {PageResult} */ (
      await api.client.expectOk(await api.product.list({ gender: 'men' }))
    );
    expect(men.total).toBe(12);

    await test.step('gender=xyz,men&price=abc&sort=bad&badge=x&size=abc,', async () => {
      const result = await api.client.expectOk(
        await api.product.list({
          gender: 'xyz,men',
          price: 'abc',
          sort: 'bad',
          badge: 'x',
          size: 'abc,',
        })
      );
      expect(result).toEqual(men);
    });

    await test.step('sale=0', async () => {
      const result = await api.client.expectOk(await api.product.list({ sale: '0' }));
      expect(result.total).toBe(30);
    });

    await test.step('q toàn khoảng trắng', async () => {
      const result = await api.client.expectOk(await api.product.list({ q: '   ' }));
      expect(result.total).toBe(30);
    });

    await test.step('gender=MEN (chữ hoa)', async () => {
      const result = await api.client.expectOk(await api.product.list({ gender: 'MEN' }));
      expect(result).toEqual(men);
    });
  });
});

test.describe('API số đếm theo bộ lọc (facets)', () => {
  test('TC-08 facets mặc định', { tag: '@smoke' }, async ({ api }) => {
    const result = await api.client.expectOk(await api.product.facets());
    expect(normalizeFacets(result)).toEqual(expectedFacets({}));

    expect(Object.keys(result)).toEqual(['gender', 'kids', 'price', 'sale', 'badge', 'size']);
    expect(result.gender).toEqual({ men: 12, women: 10, unisex: 4 });
    expect(Object.keys(result.gender)).toEqual(['men', 'women', 'unisex']);
    expect(result.kids).toEqual({ boys: 2, girls: 2 });
    expect(Object.keys(result.price)).toEqual(['under-1m', '1m-2m', '2m-5m', '5m-plus']);
    expect(Object.values(result.price)).toEqual([4, 5, 16, 5]);
    expect(result.sale).toBe(6);
    expect(result.badge).toEqual({ 'just-in': 8, bestseller: 5 });
    expect(Object.keys(result.badge)).toEqual(['just-in', 'bestseller']);

    expect(result.size).toHaveLength(18);
    expect(result.size[0].label).toBe('EU 35.5');
    expect(result.size.at(-1).label).toBe('EU 47');
    const values = result.size.map((/** @type {any} */ s) => Number(s.value));
    expect(values).toEqual([...values].sort((a, b) => a - b));
    const eu42 = result.size.find((/** @type {any} */ s) => Number(s.value) === 42);
    expect(eu42).toMatchObject({ label: 'EU 42', count: 21 });
  });

  test(
    'TC-09 facets "bỏ nhóm của chính mình" + khớp list',
    { tag: '@regression' },
    async ({ api }) => {
      await test.step('gender=men', async () => {
        const result = await api.client.expectOk(await api.product.facets({ gender: 'men' }));
        expect(normalizeFacets(result)).toEqual(expectedFacets({ gender: 'men' }));
        expect(result.gender).toEqual({ men: 12, women: 10, unisex: 4 });
        expect(Object.values(result.price)).toEqual([1, 2, 6, 3]);
        for (const s of result.size.filter((/** @type {any} */ x) => Number(x.value) <= 38)) {
          expect(s.count, s.label).toBe(0);
        }
      });

      /** @type {CatalogFilter} */
      const filter = { gender: 'men', price: '1m-2m', size: '42' };
      const facets = await api.client.expectOk(await api.product.facets(filter));

      await test.step('gender=men&price=1m-2m&size=42', async () => {
        expect(normalizeFacets(facets)).toEqual(expectedFacets(filter));
        expect(facets.gender).toEqual({ men: 2, women: 0, unisex: 0 });
        expect(Object.values(facets.price)).toEqual([1, 2, 6, 3]);
        expect(facets.sale).toBe(1);
        expect(facets.badge).toEqual({ 'just-in': 0, bestseller: 0 });
      });

      /**
       * Bộ lọc `filter` nhưng nhóm của lựa chọn chỉ còn lựa chọn đó (gender + kids là một nhóm).
       * @type {{ label: string, filter: CatalogFilter, count: number }[]}
       */
      const checks = [];
      const noGender = Object.fromEntries(
        Object.entries(filter).filter(([k]) => k !== 'gender' && k !== 'kids')
      );
      for (const [k, n] of Object.entries(facets.gender)) {
        checks.push({ label: `gender=${k}`, filter: { ...noGender, gender: k }, count: n });
      }
      for (const [k, n] of Object.entries(facets.kids)) {
        checks.push({ label: `kids=${k}`, filter: { ...noGender, kids: k }, count: n });
      }
      for (const [k, n] of Object.entries(facets.price)) {
        checks.push({ label: `price=${k}`, filter: { ...filter, price: k }, count: n });
      }
      checks.push({ label: 'sale=1', filter: { ...filter, sale: '1' }, count: facets.sale });
      for (const [k, n] of Object.entries(facets.badge)) {
        checks.push({ label: `badge=${k}`, filter: { ...filter, badge: k }, count: n });
      }
      for (const s of facets.size) {
        const v = String(Number(s.value));
        checks.push({ label: `size=${v}`, filter: { ...filter, size: v }, count: s.count });
      }

      for (const c of checks) {
        await test.step(`facets[${c.label}] = total của list`, async () => {
          const list = await api.client.expectOk(await api.product.list({ ...c.filter, limit: 1 }));
          expect(list.total, c.label).toBe(c.count);
        });
      }
    }
  );

  test('TC-10 facets có danh mục / từ khoá', { tag: '@regression' }, async ({ api }) => {
    const basketball = await api.client.expectOk(
      await api.product.facets({ category: 'basketball' })
    );
    expect(normalizeFacets(basketball)).toEqual(expectedFacets({ category: 'basketball' }));
    expect(basketball.gender).toEqual({ men: 1, women: 0, unisex: 2 });
    expect(basketball.kids).toEqual({ boys: 1, girls: 1 });
    expect(Object.values(basketball.price)).toEqual([0, 2, 3, 0]);
    expect(basketball.sale).toBe(2);
    expect(basketball.badge).toEqual({ 'just-in': 2, bestseller: 1 });

    const jordan = await api.client.expectOk(await api.product.facets({ q: 'jordan' }));
    expect(normalizeFacets(jordan)).toEqual(expectedFacets({ q: 'jordan' }));
    expect(Object.values(jordan.price)).toEqual([1, 0, 4, 0]);
    expect(jordan.badge['just-in']).toBe(3);

    // Sản phẩm ẩn (id 31 "Nike Air Max Plus Premium") không được đếm
    const airMaxPlus = await api.client.expectOk(await api.product.facets({ q: 'air max plus' }));
    expect(Object.values(airMaxPlus.gender).every((n) => n === 0)).toBe(true);
    expect(airMaxPlus.size.every((/** @type {any} */ s) => s.count === 0)).toBe(true);
  });
});

test.describe('API danh sách giày: lỗi, biên, công khai', () => {
  test('TC-11 danh mục không tồn tại', { tag: '@regression' }, async ({ api }) => {
    await api.client.expectError(
      await api.product.list({ category: 'khong-co' }),
      404,
      CATEGORY_NOT_FOUND
    );
    await api.client.expectError(
      await api.product.facets({ category: 'khong-co' }),
      404,
      CATEGORY_NOT_FOUND
    );
    await api.client.expectError(
      await api.product.list({ category: 'khong-co', page: 'abc' }),
      400
    );
  });

  test('TC-12 biên page / limit', { tag: '@regression' }, async ({ api }) => {
    const defaults = await api.client.expectOk(await api.product.list());

    await test.step('limit=0 → 12', async () => {
      const r = await api.client.expectOk(await api.product.list({ limit: 0 }));
      expect(r.items).toHaveLength(12);
    });

    await test.step('page=0 → trang 1', async () => {
      const r = await api.client.expectOk(await api.product.list({ page: 0 }));
      expect(r).toEqual(defaults);
    });

    await test.step('page=-3&limit=5 → trang 1, 5 phần tử', async () => {
      const r = await api.client.expectOk(await api.product.list({ page: -3, limit: 5 }));
      expect(r.page).toBe(1);
      expect(idsOf(r)).toEqual(expectedList({}, { limit: 5 }).items.map((i) => i.id));
    });

    for (const limit of [48, 1000]) {
      await test.step(`limit=${limit} → 30 phần tử`, async () => {
        const r = await api.client.expectOk(await api.product.list({ limit }));
        expect(r.items).toHaveLength(30);
        expect(r.total).toBe(30);
      });
    }

    await test.step('page=abc → 400', async () => {
      await api.client.expectError(
        await api.product.list({ page: 'abc' }),
        400,
        'Invalid parameter: page'
      );
    });

    await test.step('limit=x → 400', async () => {
      await api.client.expectError(
        await api.product.list({ limit: 'x' }),
        400,
        'Invalid parameter: limit'
      );
    });
  });

  test('TC-13 công khai + sai method', { tag: '@regression' }, async ({ api, request }) => {
    const bad = createApi(request, INVALID_TOKEN);
    const list = await bad.client.expectOk(await bad.product.list());
    expect(idsOf(list)).toEqual([2, 5, 14, 20, 23, 24, 25, 26, 22, 8, 15, 1]);
    expect(list.total).toBe(30);
    const facets = await bad.client.expectOk(await bad.product.facets());
    expect(normalizeFacets(facets)).toEqual(expectedFacets({}));

    for (const path of ['/product/public/list', '/product/public/facets']) {
      await test.step(`POST ${path}`, async () => {
        await api.client.expectError(await api.client.post(path), 405, METHOD_NOT_ALLOWED);
      });
    }
  });
});
