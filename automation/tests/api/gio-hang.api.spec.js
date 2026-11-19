import { createApi } from '../../api/index.js';
import cartInvalid from '../../data/cart-invalid.json' with { type: 'json' };
import cartShipping from '../../data/cart-shipping.json' with { type: 'json' };
import {
  MAX_CART_LINES,
  expectedCartCheck,
  imageSuffixOf,
  publishedProducts,
  sellingPrice,
  shippingFeeOf,
  sizeIdOf,
  stockOf,
} from '../../data/seed-products.js';
import { expect, test } from '../../fixtures/index.js';

/**
 * Lát `gio-hang` (plan/gio-hang.md §5, §9 TC-01 → TC-09): `POST /cart/public/check` (công khai) tính lại giỏ
 * localStorage — trạng thái từng dòng, giá / tồn kho lấy từ DB, tạm tính + phí giao hàng; validate §5.2.
 * Kết quả mong đợi tính từ `products.json` bằng `expectedCartCheck`. global-setup đã `test-support/reset`.
 */

const METHOD_NOT_ALLOWED = 'HTTP method not supported';
const INVALID_TOKEN = 'abc.def.ghi';

/** Body ví dụ §5.1 (6 dòng, dòng cuối kèm `price: 1` bị bỏ qua). */
const EXAMPLE_BODY = [
  { sizeId: 206, quantity: 2 },
  { sizeId: 1306, quantity: 1 },
  { sizeId: 201, quantity: 1 },
  { sizeId: 3106, quantity: 1 },
  { sizeId: 999999, quantity: 1 },
  { sizeId: 1805, quantity: 5, price: 1 },
];

/** @typedef {{ sizeId: number, quantity: number }} CartItem */

/**
 * Chuẩn hoá kết quả API để so với `expectedCartCheck`: `imageUrl` cắt về đuôi `/products/<slug>/1.webp`
 * (sau khi kiểm là URL tuyệt đối).
 * @param {Record<string, any>} result
 */
function normalizeCheck(result) {
  return {
    ...result,
    items: result.items.map((/** @type {Record<string, any>} */ line) => {
      const url = line.imageUrl;
      if (url !== null) {
        expect(String(url), `imageUrl dòng ${line.sizeId}`).toMatch(/^https?:\/\//);
      }
      return { ...line, imageUrl: url === null ? null : url.slice(url.indexOf('/products/')) };
    }),
  };
}

/**
 * Gọi `check` và so cả kết quả với `expectedCartCheck(items)`.
 * @param {import('../../api/index.js').Api} api
 * @param {CartItem[]} items
 * @param {unknown} [body] body gửi thật (mặc định = items)
 */
async function checkMatches(api, items, body = items) {
  const result = await api.client.expectOk(await api.cart.check(body));
  expect(normalizeCheck(result)).toEqual(expectedCartCheck(items));
  return result;
}

/** `n` size id khác nhau đầu tiên của các sản phẩm PUBLISHED (theo id sản phẩm, thứ tự trong lưới). @param {number} n */
function firstSizeIds(n) {
  return publishedProducts()
    .sort((a, b) => a.id - b.id)
    .flatMap((p) => stockOf(p).map((_, i) => p.id * 100 + i + 1))
    .slice(0, n);
}

test.describe('Giỏ hàng — API', () => {
  test('TC-01 kiểm tra giỏ nhiều trạng thái', { tag: '@smoke' }, async ({ api }) => {
    const items = EXAMPLE_BODY.map(({ sizeId, quantity }) => ({ sizeId, quantity }));
    const result = await checkMatches(api, items, EXAMPLE_BODY);

    expect(result.items.map((/** @type {CartItem} */ l) => l.sizeId)).toEqual([
      206, 1306, 201, 3106, 999999, 1805,
    ]);
    expect(result.items.map((/** @type {{ status: string }} */ l) => l.status)).toEqual([
      'AVAILABLE',
      'AVAILABLE',
      'OUT_OF_STOCK',
      'UNAVAILABLE',
      'UNAVAILABLE',
      'INSUFFICIENT_STOCK',
    ]);
    expect(
      result.items.map((/** @type {{ availableQuantity: number }} */ l) => l.availableQuantity)
    ).toEqual([2, 1, 0, 0, 0, 3]);
    expect(result.items[0]).toMatchObject({
      productId: 2,
      slug: 'nike-dunk-low-retro',
      name: 'Nike Dunk Low Retro',
      subtitle: "Men's Shoes",
      sizeLabel: 'EU 42',
      price: 3519000,
      salePrice: null,
      unitPrice: 3519000,
      lineTotal: 7038000,
      stock: 20,
    });
    expect(String(result.items[0].imageUrl)).toMatch(
      new RegExp(`${imageSuffixOf('nike-dunk-low-retro')}$`)
    );
    expect(result.items[3]).toMatchObject({ slug: 'nike-air-max-plus-premium', stock: 0 });
    expect(result.items[3].name).toBeTruthy();
    expect(result.items[4]).toEqual({
      sizeId: 999999,
      quantity: 1,
      status: 'UNAVAILABLE',
      availableQuantity: 0,
      stock: 0,
      productId: null,
      slug: null,
      name: null,
      subtitle: null,
      imageUrl: null,
      sizeLabel: null,
      price: null,
      salePrice: null,
      unitPrice: null,
      lineTotal: 0,
    });
    expect(result.items[5]).toMatchObject({ unitPrice: 6609000, lineTotal: 19827000 });
    expect(result).toMatchObject({
      itemCount: 6,
      subtotal: 28774000,
      shippingFee: 0,
      total: 28774000,
    });
  });

  test('TC-02 mỗi sản phẩm đang bán (30 sản phẩm)', { tag: '@regression' }, async ({ api }) => {
    const published = publishedProducts();
    expect(published).toHaveLength(30);
    // nike-p-6000 hết hàng mọi size → bỏ qua (không có "size còn hàng đầu tiên")
    for (const p of published) {
      const index = stockOf(p).findIndex((s) => s.stock > 0);
      if (index < 0) continue;
      await test.step(p.slug, async () => {
        const size = stockOf(p)[index];
        const items = [{ sizeId: p.id * 100 + index + 1, quantity: 1 }];
        const result = await checkMatches(api, items);
        const line = result.items[0];
        expect(line).toMatchObject({
          status: 'AVAILABLE',
          name: p.name,
          subtitle: p.subtitle,
          slug: p.slug,
          sizeLabel: size.sizeLabel,
          price: p.price,
          salePrice: p.salePrice,
          unitPrice: sellingPrice(p),
          stock: size.stock,
        });
        expect(String(line.imageUrl).endsWith(imageSuffixOf(p.slug))).toBe(true);
        expect(result.subtotal).toBe(sellingPrice(p));
        expect(result.shippingFee).toBe(shippingFeeOf(result.subtotal));
      });
    }
  });

  test('TC-03 phí giao hàng — giá trị biên', { tag: '@regression' }, async ({ api }) => {
    for (const c of cartShipping.cases) {
      await test.step(c.name, async () => {
        const result = await checkMatches(api, c.items);
        expect({
          subtotal: result.subtotal,
          shippingFee: result.shippingFee,
          total: result.total,
        }).toEqual({ subtotal: c.subtotal, shippingFee: c.shippingFee, total: c.total });
      });
    }
  });

  test('TC-04 số lượng biên hợp lệ', { tag: '@regression' }, async ({ api }) => {
    await test.step('[{206, 1}]', async () => {
      await checkMatches(api, [{ sizeId: 206, quantity: 1 }]);
    });

    await test.step('[{206, 10}]', async () => {
      const result = await checkMatches(api, [{ sizeId: 206, quantity: 10 }]);
      expect(result.items[0]).toMatchObject({ status: 'AVAILABLE', lineTotal: 35190000 });
      expect(result.shippingFee).toBe(0);
    });

    await test.step('50 dòng', async () => {
      const items = firstSizeIds(MAX_CART_LINES).map((sizeId) => ({ sizeId, quantity: 1 }));
      expect(new Set(items.map((i) => i.sizeId)).size).toBe(MAX_CART_LINES);
      const result = await checkMatches(api, items);
      expect(result.items).toHaveLength(MAX_CART_LINES);
      expect(result.items.map((/** @type {CartItem} */ l) => l.sizeId)).toEqual(
        items.map((i) => i.sizeId)
      );
    });
  });

  test('TC-05 validate', { tag: '@regression' }, async ({ api }) => {
    for (const c of /** @type {{ name: string, body?: unknown, lines?: number, noBody?: boolean, message: string }[]} */ (
      cartInvalid.cases
    )) {
      await test.step(c.name, async () => {
        const body = c.noBody
          ? undefined
          : c.lines
            ? firstSizeIds(c.lines).map((sizeId) => ({ sizeId, quantity: 1 }))
            : c.body;
        if (c.lines) expect(/** @type {unknown[]} */ (body)).toHaveLength(c.lines);
        await api.client.expectError(await api.cart.check(body), 400, c.message);
      });
    }
  });

  test('TC-06 size không mua được', { tag: '@regression' }, async ({ api }) => {
    const p6000 = sizeIdOf('nike-p-6000', 'EU 38');
    expect(p6000).toBe(905);

    /** @type {[string, CartItem, Record<string, unknown>, boolean][]} */
    const cases = [
      ['hết hàng', { sizeId: 201, quantity: 1 }, { status: 'OUT_OF_STOCK', stock: 0 }, true],
      [
        'sản phẩm ẩn',
        { sizeId: 3106, quantity: 2 },
        { status: 'UNAVAILABLE', stock: 0, lineTotal: 0 },
        true,
      ],
      [
        'size không tồn tại',
        { sizeId: 999999, quantity: 1 },
        { status: 'UNAVAILABLE', name: null },
        true,
      ],
      [
        'đúng bằng tồn kho',
        { sizeId: 1805, quantity: 3 },
        { status: 'AVAILABLE', stock: 3 },
        false,
      ],
      [
        'vượt tồn kho',
        { sizeId: 1805, quantity: 4 },
        { status: 'INSUFFICIENT_STOCK', availableQuantity: 3 },
        false,
      ],
      [
        'sản phẩm hết hàng mọi size',
        { sizeId: p6000, quantity: 1 },
        { status: 'OUT_OF_STOCK' },
        true,
      ],
    ];
    for (const [name, item, expected, zero] of cases) {
      await test.step(name, async () => {
        const result = await checkMatches(api, [item]);
        expect(result.items[0]).toMatchObject(expected);
        if (name === 'sản phẩm ẩn') expect(result.items[0].name).toBeTruthy();
        if (zero) {
          expect({
            itemCount: result.itemCount,
            subtotal: result.subtotal,
            shippingFee: result.shippingFee,
          }).toEqual({ itemCount: 0, subtotal: 0, shippingFee: 0 });
        }
      });
    }
  });

  test('TC-07 công khai + sai method', { tag: '@regression' }, async ({ api, request }) => {
    await test.step('token sai vẫn 200', async () => {
      const bad = createApi(request, INVALID_TOKEN);
      const items = EXAMPLE_BODY.map(({ sizeId, quantity }) => ({ sizeId, quantity }));
      await checkMatches(bad, items, EXAMPLE_BODY);
    });

    await test.step('GET → 405', async () => {
      await api.client.expectError(await api.cart.checkWithGet(), 405, METHOD_NOT_ALLOWED);
    });
  });

  test('TC-08 check không giữ chỗ / không đổi kho', { tag: '@regression' }, async ({ api }) => {
    for (let i = 1; i <= 3; i += 1) {
      await test.step(`lần ${i}`, async () => {
        const result = await checkMatches(api, [{ sizeId: 1306, quantity: 1 }]);
        expect(result.items[0]).toMatchObject({ status: 'AVAILABLE', stock: 1 });
      });
    }

    await test.step('tồn kho ở trang chi tiết không đổi', async () => {
      const detail = await api.client.expectOk(await api.product.get('nike-revolution-8'));
      const size = detail.sizes.find((/** @type {{ id: number }} */ s) => s.id === 1306);
      expect(size).toMatchObject({ sizeLabel: 'EU 42', stock: 1 });
    });
  });

  test('TC-09 giá luôn theo DB', { tag: '@regression' }, async ({ api }) => {
    const body = [
      { sizeId: 1906, quantity: 1, price: 1, salePrice: 1, unitPrice: 1, lineTotal: 1 },
    ];
    const result = await checkMatches(api, [{ sizeId: 1906, quantity: 1 }], body);
    expect(result.items[0]).toMatchObject({
      price: 2119000,
      salePrice: 2000000,
      unitPrice: 2000000,
      lineTotal: 2000000,
    });
    expect(result.subtotal).toBe(2000000);
  });
});
