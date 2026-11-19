import orderInvalid from '../../data/order-invalid.json' with { type: 'json' };
import orderShipping from '../../data/order-shipping.json' with { type: 'json' };
import orderUnavailable from '../../data/order-unavailable.json' with { type: 'json' };
import {
  DELIVERY,
  ORDER_CODE_RE,
  ORDER_MESSAGES as M,
  expectedOrder,
  orderBody,
  soldOutMessage,
  yymmddOf,
} from '../../data/orders.js';
import {
  expectedCartCheck,
  publishedProducts,
  seedSizeOf,
  stockOf,
} from '../../data/seed-products.js';
import { expect, test } from '../../fixtures/index.js';

/**
 * Lát `dat-hang` (plan/dat-hang.md §5, §9 TC-01 → TC-13): `POST /shop-order/create` (đặt COD, giá từ DB,
 * trừ kho có điều kiện trong một transaction), `GET /shop-order/get` (chỉ chủ đơn), `POST /test-support/stock`.
 * Thuộc pha `@stock` (test làm đổi tồn kho): mỗi test dùng size riêng và đặt lại tồn kho bằng `setStock`
 * ở đầu test nên chạy lại / retry vẫn đúng. Kết quả mong đợi tính từ `products.json` (`expectedOrder`).
 */

const INVALID_TOKEN = 'abc.def.ghi';

/** @typedef {{ sizeId: number, quantity: number }} CartItem */
/** @typedef {import('../../api/index.js').Api} Api */

/**
 * Bỏ các field không so được (`id`, `code`, `userId`, thời gian; `id` / `orderId` của dòng) và cắt `imageUrl`
 * về đuôi `/products/<slug>/1.webp` (sau khi kiểm là URL tuyệt đối), để so với `expectedOrder`.
 * @param {Record<string, any>} order
 */
function normalizeOrder(order) {
  // eslint-disable-next-line no-unused-vars
  const { id, code, userId, createdTime, updatedTime, items, ...rest } = order;
  return {
    ...rest,
    items: items.map((/** @type {Record<string, any>} */ line) => {
      // eslint-disable-next-line no-unused-vars
      const { id: lineId, orderId, imageUrl, ...other } = line;
      expect(String(imageUrl), `imageUrl dòng ${line.sizeId}`).toMatch(/^https?:\/\//);
      return { ...other, imageUrl: imageUrl.slice(imageUrl.indexOf('/products/')) };
    }),
  };
}

/**
 * Tồn kho hiện tại của một size (đọc `GET /product/public/get` của sản phẩm chứa size).
 * @param {Api} api
 * @param {number} sizeId
 */
async function stockNow(api, sizeId) {
  const found = seedSizeOf(sizeId);
  if (!found) throw new Error(`size ${sizeId} không có trong products.json`);
  const detail = await api.client.expectOk(await api.product.get(found.product.slug));
  const size = detail.sizes.find((/** @type {{ id: number }} */ s) => s.id === sizeId);
  return /** @type {number} */ (size.stock);
}

/**
 * Tạo đơn và khẳng định 200, trả đơn.
 * @param {Api} api
 * @param {unknown} body
 */
async function createOk(api, body) {
  return api.client.expectOk(await api.order.create(body));
}

/** `n` size id khác nhau đầu tiên của các sản phẩm PUBLISHED. @param {number} n */
function firstSizeIds(n) {
  return publishedProducts()
    .sort((a, b) => a.id - b.id)
    .flatMap((p) => stockOf(p).map((_, i) => p.id * 100 + i + 1))
    .slice(0, n);
}

/**
 * Body của một ca `order-invalid.json`.
 * @param {{ set?: Record<string, unknown>, omit?: string[], lines?: number, raw?: unknown }} c
 */
function invalidBody(c) {
  if ('raw' in c) return c.raw;
  /** @type {Record<string, unknown>} */
  const body = orderBody(orderInvalid.baseItems, c.set ?? {});
  if (c.lines) body.items = firstSizeIds(c.lines).map((sizeId) => ({ sizeId, quantity: 1 }));
  for (const key of c.omit ?? []) delete body[key];
  return body;
}

test.describe('Đặt hàng — API @stock', () => {
  test('TC-01 đặt COD hai dòng', { tag: '@smoke' }, async ({ api, apiAs }) => {
    const admin = await apiAs('admin');
    const khach1 = await apiAs('khach1');
    await admin.testSupport.setStockOk(206, 20);
    await admin.testSupport.setStockOk(1906, 20);
    const me = await khach1.client.expectOk(await khach1.account.me());
    /** @type {CartItem[]} */
    const items = [
      { sizeId: 206, quantity: 1 },
      { sizeId: 1906, quantity: 2 },
    ];

    const order = await createOk(khach1, orderBody(items));

    expect(order.code).toMatch(ORDER_CODE_RE);
    expect(order.userId).toBe(me.id);
    expect(order).toMatchObject({
      status: 'PLACED',
      paymentMethod: 'COD',
      ...DELIVERY,
      itemCount: 3,
      subtotal: 7519000,
      shippingFee: 0,
      total: 7519000,
    });
    expect(normalizeOrder(order)).toEqual(expectedOrder(items));
    expect(order.items.map((/** @type {CartItem} */ l) => l.sizeId)).toEqual([206, 1906]);
    expect(order.items[0]).toMatchObject({
      orderId: order.id,
      productName: 'Nike Dunk Low Retro',
      productSubtitle: "Men's Shoes",
      sizeLabel: 'EU 42',
      unitPrice: 3519000,
      lineTotal: 3519000,
    });
    expect(String(order.items[0].imageUrl)).toMatch(/\/products\/nike-dunk-low-retro\/1\.webp$/);
    expect(order.items[1]).toMatchObject({ unitPrice: 2000000, quantity: 2, lineTotal: 4000000 });

    const again = await khach1.client.expectOk(await khach1.order.get(order.code));
    expect(again).toEqual(order);

    expect(await stockNow(api, 206)).toBe(19);
    expect(await stockNow(api, 1906)).toBe(18);
  });

  for (const c of orderShipping.cases) {
    test(`TC-02 phí giao hàng: ${c.name}`, { tag: '@regression' }, async ({ apiAs }) => {
      const admin = await apiAs('admin');
      const khach1 = await apiAs('khach1');
      for (const { sizeId } of c.items) await admin.testSupport.setStockOk(sizeId, 20);

      const order = await createOk(khach1, orderBody(c.items));

      expect(order).toMatchObject({
        itemCount: c.itemCount,
        subtotal: c.subtotal,
        shippingFee: c.shippingFee,
        total: c.total,
      });
      expect(normalizeOrder(order)).toEqual(expectedOrder(c.items));
    });
  }

  test('TC-03 field do server quản, giá theo DB', { tag: '@regression' }, async ({ apiAs }) => {
    const admin = await apiAs('admin');
    const khach1 = await apiAs('khach1');
    const khach2 = await apiAs('khach2');
    await admin.testSupport.setStockOk(2405, 20);
    const me1 = await khach1.client.expectOk(await khach1.account.me());
    const me2 = await khach2.client.expectOk(await khach2.account.me());

    const order = await createOk(
      khach1,
      orderBody([{ sizeId: 2405, quantity: 1, unitPrice: 1, lineTotal: 1 }], {
        id: 999,
        code: 'DH0000000001',
        userId: me2.id,
        status: 'DELIVERED',
        subtotal: 1,
        shippingFee: 0,
        total: 1,
        itemCount: 9,
      })
    );

    expect(order.id).not.toBe(999);
    expect(order.code).not.toBe('DH0000000001');
    expect(order.code).toMatch(ORDER_CODE_RE);
    expect(order.userId).toBe(me1.id);
    expect(order).toMatchObject({
      status: 'PLACED',
      subtotal: 3669000,
      shippingFee: 30000,
      total: 3699000,
      itemCount: 1,
    });
    expect(order.items[0]).toMatchObject({ unitPrice: 3669000, lineTotal: 3669000 });
  });

  test('TC-04 validate', { tag: '@regression' }, async ({ api, apiAs }) => {
    const admin = await apiAs('admin');
    const khach1 = await apiAs('khach1');
    await admin.testSupport.setStockOk(1305, 20);

    for (const c of orderInvalid.cases) {
      await test.step(c.name, async () => {
        await khach1.client.expectError(await khach1.order.create(invalidBody(c)), 400, c.message);
      });
    }

    expect(await stockNow(api, 1305)).toBe(20);
  });

  test('TC-05 dòng không mua được', { tag: '@regression' }, async ({ api, apiAs }) => {
    const khach1 = await apiAs('khach1');
    const before = { 1304: await stockNow(api, 1304), 1805: await stockNow(api, 1805) };
    expect(before).toEqual({ 1304: 20, 1805: 3 });

    for (const c of orderUnavailable.cases) {
      await test.step(c.name, async () => {
        await khach1.client.expectError(
          await khach1.order.create(orderBody(c.items)),
          400,
          c.message
        );
      });
    }

    expect(await stockNow(api, 1304)).toBe(20);
    expect(await stockNow(api, 1805)).toBe(3);
  });

  test('TC-06 mua đúng hết tồn kho', { tag: '@regression' }, async ({ api, apiAs }) => {
    const admin = await apiAs('admin');
    const khach1 = await apiAs('khach1');
    await admin.testSupport.setStockOk(1307, 2);

    const order = await createOk(khach1, orderBody([{ sizeId: 1307, quantity: 2 }]));
    expect(order).toMatchObject({ subtotal: 3818000, shippingFee: 30000, total: 3848000 });
    expect(await stockNow(api, 1307)).toBe(0);

    await khach1.client.expectError(
      await khach1.order.create(orderBody([{ sizeId: 1307, quantity: 1 }])),
      400,
      'Nike Revolution 8 (EU 42.5) is sold out. Please update your bag.'
    );
    expect(soldOutMessage(1307)).toBe(
      'Nike Revolution 8 (EU 42.5) is sold out. Please update your bag.'
    );

    const check = await api.client.expectOk(await api.cart.check([{ sizeId: 1307, quantity: 1 }]));
    expect(check.items[0].status).toBe('OUT_OF_STOCK');
  });

  test('TC-07 tranh mua đôi cuối (đồng thời)', { tag: '@regression' }, async ({ api, apiAs }) => {
    const admin = await apiAs('admin');
    const khach1 = await apiAs('khach1');
    const khach2 = await apiAs('khach2');

    for (let round = 1; round <= 3; round += 1) {
      await test.step(`(a) vòng ${round}: hai khách tranh size 1306 còn 1`, async () => {
        await admin.testSupport.setStockOk(1306, 1);
        const body = orderBody([{ sizeId: 1306, quantity: 1 }]);
        const responses = await Promise.all([khach1.order.create(body), khach2.order.create(body)]);
        const statuses = responses.map((r) => r.status()).sort();
        expect(statuses).toEqual([200, 400]);
        const loser = responses.find((r) => r.status() === 400);
        expect((await loser?.json())?.message).toBe(
          'Nike Revolution 8 (EU 42) is sold out. Please update your bag.'
        );
        expect(await stockNow(api, 1306)).toBe(0);
      });
    }

    await test.step('(b) 5 request đồng thời, size 1308 còn 3', async () => {
      await admin.testSupport.setStockOk(1308, 3);
      const body = orderBody([{ sizeId: 1308, quantity: 1 }]);
      const responses = await Promise.all([
        khach1.order.create(body),
        khach2.order.create(body),
        khach1.order.create(body),
        khach2.order.create(body),
        khach1.order.create(body),
      ]);
      const ok = responses.filter((r) => r.status() === 200);
      const failed = responses.filter((r) => r.status() !== 200);
      expect(ok).toHaveLength(3);
      expect(failed).toHaveLength(2);
      for (const r of failed) {
        expect(r.status()).toBe(400);
        expect((await r.json()).message).toBe(
          'Nike Revolution 8 (EU 43) is sold out. Please update your bag.'
        );
      }
      const codes = await Promise.all(ok.map(async (r) => (await r.json()).result.code));
      expect(new Set(codes).size).toBe(3);
      expect(await stockNow(api, 1308)).toBe(0);
    });
  });

  test('TC-08 chuẩn hoá chuỗi', { tag: '@regression' }, async ({ apiAs }) => {
    const admin = await apiAs('admin');
    const khach1 = await apiAs('khach1');
    await admin.testSupport.setStockOk(2407, 20);

    const order = await createOk(
      khach1,
      orderBody([{ sizeId: 2407, quantity: 1 }], {
        receiverName: '  Customer One  ',
        phone: ' 0901234567 ',
        address: '  12 Nguyen Hue Street  ',
        note: '   ',
      })
    );

    expect(order).toMatchObject({
      receiverName: 'Customer One',
      phone: '0901234567',
      address: '12 Nguyen Hue Street',
      note: null,
    });
  });

  test('TC-09 mã đơn', { tag: '@regression' }, async ({ apiAs }) => {
    const admin = await apiAs('admin');
    const khach1 = await apiAs('khach1');
    const sizes = [2401, 2402, 2403];
    for (const sizeId of sizes) await admin.testSupport.setStockOk(sizeId, 20);

    const responses = await Promise.all(
      sizes.map((sizeId) => khach1.order.create(orderBody([{ sizeId, quantity: 1 }])))
    );
    const orders = await Promise.all(responses.map((r) => khach1.client.expectOk(r)));

    expect(new Set(orders.map((o) => o.code)).size).toBe(3);
    for (const o of orders) {
      expect(o.code).toMatch(ORDER_CODE_RE);
      expect(o.code.slice(2, 8)).toBe(yymmddOf(o.createdTime));
      expect(Number(o.code.slice(8))).toBe(o.id % 10000);
    }
  });

  test('TC-10 xem đơn: chỉ chủ đơn', { tag: '@regression' }, async ({ apiAs }) => {
    const admin = await apiAs('admin');
    const khach1 = await apiAs('khach1');
    const khach2 = await apiAs('khach2');
    await admin.testSupport.setStockOk(2408, 20);
    const order = await createOk(khach1, orderBody([{ sizeId: 2408, quantity: 1 }]));

    expect(await khach1.client.expectOk(await khach1.order.get(order.code))).toEqual(order);
    await khach2.client.expectError(await khach2.order.get(order.code), 404, M.notFound);
    await admin.client.expectError(await admin.order.get(order.code), 404, M.notFound);
    await khach1.client.expectError(await khach1.order.get('DH0000000000'), 404, M.notFound);
    await khach1.client.expectError(await khach1.order.get(''), 404, M.notFound);
    await khach1.client.expectError(await khach1.order.get(), 400, M.missingCode);
  });

  test('TC-11 đăng nhập + sai method', { tag: '@regression' }, async ({ api, apiAs }) => {
    const body = orderBody([{ sizeId: 1309, quantity: 1 }]);
    await api.client.expectError(await api.order.create(body), 401, M.signIn);
    await api.client.expectError(await api.order.get('DH0000000000'), 401, M.signIn);

    api.useToken(INVALID_TOKEN);
    await api.client.expectError(await api.order.create(body), 401, M.invalidToken);

    const khach1 = await apiAs('khach1');
    await khach1.client.expectError(await khach1.order.createWithGet(), 405, M.methodNotAllowed);
  });

  test('TC-12 test-support/stock', { tag: '@regression' }, async ({ api, apiAs }) => {
    const admin = await apiAs('admin');
    const khach1 = await apiAs('khach1');

    const size = await admin.client.expectOk(await admin.testSupport.setStock(2409, 7));
    expect(size).toMatchObject({ id: 2409, productId: 24, sizeLabel: 'EU 44', stock: 7 });
    const detail = await api.client.expectOk(
      await api.product.get('air-jordan-1-low-se-magic-ball')
    );
    expect(
      detail.sizes.find((/** @type {{ sizeLabel: string }} */ s) => s.sizeLabel === 'EU 44')
    ).toMatchObject({ id: 2409, stock: 7 });

    await khach1.client.expectError(
      await khach1.testSupport.setStock(2409, 5),
      403,
      M.accessDenied
    );
    await api.client.expectError(await api.testSupport.setStock(2409, 5), 401, M.signIn);
    await admin.client.expectError(
      await admin.testSupport.setStock(999999, 5),
      404,
      M.stockNotFound
    );
    await admin.client.expectError(await admin.testSupport.setStock(2409, -1), 400, M.invalidStock);
    await admin.client.expectError(await admin.testSupport.setStock(2409), 400, M.invalidStock);

    const restored = await admin.client.expectOk(await admin.testSupport.setStock(2409, 20));
    expect(restored.stock).toBe(20);
  });

  test('TC-13 rollback khi ghi đơn lỗi', { tag: '@regression' }, async ({ api, apiAs }) => {
    const admin = await apiAs('admin');
    const khach1 = await apiAs('khach1');
    await admin.testSupport.setStockOk(1309, 20);
    expect(expectedCartCheck([{ sizeId: 1309, quantity: 2 }]).items[0].status).toBe('AVAILABLE');

    await khach1.client.expectError(
      await khach1.order.create(
        orderBody([{ sizeId: 1309, quantity: 2 }], { address: 'a'.repeat(300) })
      ),
      400,
      M.invalidRequest
    );

    expect(await stockNow(api, 1309)).toBe(20);
  });
});
