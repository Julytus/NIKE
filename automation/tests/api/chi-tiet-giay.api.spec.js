import { createApi } from '../../api/index.js';
import {
  RELATED_LIMIT,
  expectedDetail,
  expectedRelated,
  imageSuffixOf,
  publishedProducts,
  seedBySlug,
} from '../../data/seed-products.js';
import { expect, test } from '../../fixtures/index.js';

/**
 * Lát `chi-tiet-giay` (plan/chi-tiet-giay.md §5, §9 TC-01 → TC-09): `GET /product/public/get?slug=`
 * (chi tiết + 5 ảnh + lưới size có tồn kho) và `GET /product/public/related?slug=` (8 thẻ, cùng danh mục
 * trước), công khai. Kết quả mong đợi tính từ `products.json` bằng `expectedDetail` / `expectedRelated`.
 * global-setup đã `test-support/reset` trước khi chạy.
 */

const PRODUCT_NOT_FOUND = 'Product not found';
const MISSING_SLUG = 'Missing required parameter: slug';
const METHOD_NOT_ALLOWED = 'HTTP method not supported';
const INVALID_TOKEN = 'abc.def.ghi';
const DUNK = 'nike-dunk-low-retro';
const HIDDEN_SLUG = 'nike-air-max-plus-premium';
const HIDDEN_ID = 31;
const SOLD_OUT_ID = 9;

/** Khoá có ở mọi thẻ sản phẩm (§5.1: "mọi cột của product + imageUrl + totalStock"). */
const CARD_KEYS = [
  'id',
  'slug',
  'styleCode',
  'name',
  'subtitle',
  'gender',
  'categoryId',
  'description',
  'price',
  'salePrice',
  'badge',
  'status',
  'createdTime',
  'updatedTime',
  'imageUrl',
  'totalStock',
];

/**
 * Lấy các field so được với `cardOf` của một thẻ API.
 * @param {Record<string, any>} card
 */
const cardFields = (card) => ({
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
 * So kết quả `get` với `expectedDetail(slug)` (ảnh so theo đuôi URL, `sizeValue` so theo số).
 * @param {Record<string, any>} detail
 * @param {string} slug
 */
function expectDetailMatches(detail, slug) {
  const expected = expectedDetail(slug);
  const { images, sizes, categoryId, description, ...card } = expected;
  expect(cardFields(detail)).toEqual(card);
  expect(detail.categoryId).toBe(categoryId);
  expect(detail.description).toBe(description);
  expect(detail.status).toBe('PUBLISHED');
  for (const key of CARD_KEYS) expect(detail, `thiếu khoá ${key}`).toHaveProperty(key);
  expect(String(detail.imageUrl)).toMatch(new RegExp(`${imageSuffixOf(slug)}$`));

  expect(
    detail.images.map((/** @type {Record<string, any>} */ i) => ({
      id: i.id,
      productId: i.productId,
      sortOrder: i.sortOrder,
    }))
  ).toEqual(images.map((i) => ({ id: i.id, productId: i.productId, sortOrder: i.sortOrder })));
  detail.images.forEach((/** @type {Record<string, any>} */ img, /** @type {number} */ i) => {
    expect(String(img.url).endsWith(images[i].urlSuffix), `ảnh ${img.url}`).toBe(true);
  });

  expect(
    detail.sizes.map((/** @type {Record<string, any>} */ s) => ({
      id: s.id,
      productId: s.productId,
      sizeLabel: s.sizeLabel,
      sizeValue: Number(s.sizeValue),
      stock: s.stock,
    }))
  ).toEqual(sizes);
  const sum = detail.sizes.reduce(
    (/** @type {number} */ acc, /** @type {Record<string, any>} */ s) => acc + s.stock,
    0
  );
  expect(detail.totalStock).toBe(sum);
}

/**
 * So kết quả `related` với `expectedRelated(slug)`: đúng thứ tự, đủ khoá thẻ, ảnh 1, không có khoá chi tiết.
 * @param {Record<string, any>[]} cards
 * @param {string} slug
 */
function expectRelatedMatches(cards, slug) {
  expect(cards.map(cardFields)).toEqual(expectedRelated(slug));
  expect(cards.length).toBeLessThanOrEqual(RELATED_LIMIT);
  const self = seedBySlug(slug);
  const ids = cards.map((c) => c.id);
  expect(ids).not.toContain(self.id);
  expect(ids).not.toContain(HIDDEN_ID);
  for (const card of cards) {
    for (const key of CARD_KEYS) expect(card, `thiếu khoá ${key}`).toHaveProperty(key);
    expect(String(card.imageUrl)).toMatch(new RegExp(`${imageSuffixOf(String(card.slug))}$`));
    expect(card).not.toHaveProperty('images');
    expect(card).not.toHaveProperty('sizes');
  }
}

test.describe('Chi tiết giày — API', () => {
  test('TC-01 chi tiết một sản phẩm', { tag: '@smoke' }, async ({ api }) => {
    const detail = await api.client.expectOk(await api.product.get(DUNK));
    expectDetailMatches(detail, DUNK);

    expect(detail.id).toBe(2);
    expect(detail.price).toBe(3519000);
    expect(detail.salePrice).toBeNull();
    expect(detail.badge).toBe('JUST_IN');
    expect(detail.totalStock).toBe(220);
    expect(detail.categoryId).toBe(1);
    expect(detail.styleCode).toBe('IQ0157-001');
    expect(detail.images.map((/** @type {{ id: number }} */ i) => i.id)).toEqual([
      21, 22, 23, 24, 25,
    ]);
    expect(detail.sizes).toHaveLength(13);
    expect(detail.sizes[0]).toMatchObject({ id: 201, sizeLabel: 'EU 38.5', stock: 0 });
    expect(detail.sizes[12]).toMatchObject({ id: 213, sizeLabel: 'EU 47', stock: 20 });
    const outOfStock = detail.sizes
      .filter((/** @type {{ stock: number }} */ s) => s.stock === 0)
      .map((/** @type {{ id: number }} */ s) => s.id);
    expect(outOfStock).toEqual([201, 212]);
    const otherStocks = detail.sizes
      .filter((/** @type {{ stock: number }} */ s) => s.stock !== 0)
      .map((/** @type {{ stock: number }} */ s) => s.stock);
    expect(otherStocks).toEqual(Array(11).fill(20));
  });

  test(
    'TC-02 chi tiết khớp products.json với mọi sản phẩm',
    { tag: '@regression' },
    async ({ api }) => {
      const published = publishedProducts();
      expect(published).toHaveLength(30);
      /** @type {Record<string, number>} */
      const sizeCount = { MEN: 13, UNISEX: 13, WOMEN: 11, BOYS: 8, GIRLS: 8 };

      for (const p of published) {
        await test.step(p.slug, async () => {
          const detail = await api.client.expectOk(await api.product.get(p.slug));
          expectDetailMatches(detail, p.slug);
          expect(detail.sizes).toHaveLength(sizeCount[p.gender]);
        });
      }

      await test.step('ví dụ cụ thể', async () => {
        const p6000 = await api.client.expectOk(await api.product.get('nike-p-6000'));
        expect(p6000.sizes).toHaveLength(11);
        expect(p6000.sizes.every((/** @type {{ stock: number }} */ s) => s.stock === 0)).toBe(true);
        expect(p6000.totalStock).toBe(0);

        const vaporfly = await api.client.expectOk(await api.product.get('nike-vaporfly-4'));
        const inStock = vaporfly.sizes.filter((/** @type {{ stock: number }} */ s) => s.stock > 0);
        expect(inStock).toHaveLength(1);
        expect(inStock[0]).toMatchObject({ sizeLabel: 'EU 38', stock: 3 });
        expect(vaporfly.totalStock).toBe(3);

        const revolution = await api.client.expectOk(await api.product.get('nike-revolution-8'));
        expect(
          revolution.sizes.find((/** @type {{ sizeLabel: string }} */ s) => s.sizeLabel === 'EU 42')
            ?.stock
        ).toBe(1);
        expect(revolution.totalStock).toBe(241);

        const precision = await api.client.expectOk(await api.product.get('nike-precision-8-low'));
        expect(precision.salePrice).toBe(2000000);
        expect(precision.price).toBe(2119000);
      });
    }
  );

  test('TC-03 không tìm thấy', { tag: '@regression' }, async ({ api }) => {
    for (const [label, slug] of [
      ['sản phẩm ẩn', HIDDEN_SLUG],
      ['slug không có', 'khong-co'],
      ['slug rỗng', ''],
      ['slug toàn khoảng trắng', '  '],
    ]) {
      await test.step(`${label} → 404`, async () => {
        await api.client.expectError(await api.product.get(slug), 404, PRODUCT_NOT_FOUND);
      });
    }

    await test.step('không gửi slug → 400', async () => {
      await api.client.expectError(await api.product.get(), 400, MISSING_SLUG);
    });
  });

  test('TC-04 chuẩn hoá slug', { tag: '@regression' }, async ({ api }) => {
    for (const slug of [` ${DUNK} `, DUNK.toUpperCase()]) {
      await test.step(JSON.stringify(slug), async () => {
        const detail = await api.client.expectOk(await api.product.get(slug));
        expect(detail.id).toBe(2);
        expect(detail.slug).toBe(DUNK);
      });
    }
  });

  test('TC-05 "You Might Also Like" — cùng danh mục trước', { tag: '@smoke' }, async ({ api }) => {
    const cards = await api.client.expectOk(await api.product.related(DUNK));
    expect(cards.map((/** @type {{ id: number }} */ c) => c.id)).toEqual([
      5, 8, 1, 3, 11, 7, 4, 12,
    ]);
    expectRelatedMatches(cards, DUNK);
    expect(cards.map((/** @type {{ id: number }} */ c) => c.id)).not.toContain(SOLD_OUT_ID);
  });

  test('TC-06 bù sản phẩm khác danh mục', { tag: '@regression' }, async ({ api }) => {
    for (const p of publishedProducts()) {
      await test.step(p.slug, async () => {
        const cards = await api.client.expectOk(await api.product.related(p.slug));
        expect(cards).toHaveLength(RELATED_LIMIT);
        expectRelatedMatches(cards, p.slug);
      });
    }

    for (const [slug, ids] of /** @type {[string, number[]][]} */ ([
      ['nike-mercurial-vapor-17-elite', [30, 2, 5, 14, 20, 23, 24, 25]],
      ['nike-revolution-8', [14, 15, 18, 17, 16, 2, 5, 20]],
      ['nike-p-6000', [2, 5, 8, 1, 3, 11, 7, 4]],
      ['nike-precision-8-low', [20, 23, 22, 21, 2, 5, 14, 24]],
      ['jordan-franchise', [24, 25, 26, 27, 2, 5, 14, 20]],
    ])) {
      await test.step(`ví dụ ${slug}`, async () => {
        const cards = await api.client.expectOk(await api.product.related(slug));
        expect(cards.map((/** @type {{ id: number }} */ c) => c.id)).toEqual(ids);
      });
    }
  });

  test('TC-07 related không tìm thấy', { tag: '@regression' }, async ({ api }) => {
    for (const [label, slug] of [
      ['sản phẩm ẩn', HIDDEN_SLUG],
      ['slug không có', 'khong-co'],
      ['slug toàn khoảng trắng', ' '],
    ]) {
      await test.step(`${label} → 404`, async () => {
        await api.client.expectError(await api.product.related(slug), 404, PRODUCT_NOT_FOUND);
      });
    }

    await test.step('không gửi slug → 400', async () => {
      await api.client.expectError(await api.product.related(), 400, MISSING_SLUG);
    });
  });

  test('TC-08 công khai + sai method', { tag: '@regression' }, async ({ api, request }) => {
    const bad = createApi(request, INVALID_TOKEN);

    await test.step('token sai vẫn 200', async () => {
      const detail = await bad.client.expectOk(await bad.product.get(DUNK));
      expectDetailMatches(detail, DUNK);
      const cards = await bad.client.expectOk(await bad.product.related(DUNK));
      expect(cards.map((/** @type {{ id: number }} */ c) => c.id)).toEqual([
        5, 8, 1, 3, 11, 7, 4, 12,
      ]);
    });

    for (const path of ['/product/public/get', '/product/public/related']) {
      await test.step(`POST ${path}`, async () => {
        await api.client.expectError(
          await api.client.post(`${path}?slug=${DUNK}`),
          405,
          METHOD_NOT_ALLOWED
        );
      });
    }
  });

  test('TC-09 thẻ ở API khác không có khoá mới', { tag: '@regression' }, async ({ api }) => {
    /** @param {Record<string, any>[]} cards */
    const expectPlainCards = (cards) => {
      expect(cards.length).toBeGreaterThan(0);
      for (const card of cards) {
        expect(card).not.toHaveProperty('images');
        expect(card).not.toHaveProperty('sizes');
        expect(card).toHaveProperty('imageUrl');
        expect(card).toHaveProperty('totalStock');
      }
    };

    await test.step('list?limit=48', async () => {
      const page = await api.client.expectOk(await api.product.list({ limit: 48 }));
      expectPlainCards(page.items);
    });

    await test.step('new-arrivals', async () => {
      expectPlainCards(await api.client.expectOk(await api.product.newArrivals()));
    });

    await test.step('suggest?q=nike', async () => {
      const r = await api.client.expectOk(await api.product.suggest('nike'));
      expectPlainCards(r.items);
    });
  });
});
