import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { storageStateOf } from '../../data/accounts.js';
import { DELIVERY, FLOW_STOCK, flowOf } from '../../data/flows.js';
import {
  CATALOG_PAGE_SIZE,
  expectedList,
  expectedNewArrivals,
  seedBySlug,
} from '../../data/seed-products.js';
import { expect, test } from '../../fixtures/index.js';
import { formatVnd } from '../../utils/format.js';
import {
  ANY_API,
  abortRoute,
  apiPath,
  collectPageErrors,
  countRequests,
  delayed,
  failOnce,
} from '../../utils/network.js';

/**
 * Lát `kiem-thu-hoi-quy` (plan/kiem-thu-hoi-quy.md §9.3 TC-11 → TC-15): network mocking ngoài các ca
 * 500 / abort / chậm đã có ở spec từng lát — lỗi rồi thử lại (`failOnce`), mất ảnh sản phẩm, chậm toàn tuyến
 * cả luồng mua, mạng chậm thật bằng CDP, phát lại HAR (trang chạy không cần backend).
 */

const MOBILE = 'mobile-chrome';
const LIST_URL = apiPath('/product/public/list');
const CREATE_URL = apiPath('/shop-order/create');
/** Ảnh sản phẩm trên MinIO: `…/products/<slug>/<n>.webp`. */
const PRODUCT_IMAGE = /\/products\/[^/]+\/\d+\.webp(\?|$)/;
const HAR_FILE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../data/har/catalog.har'
);
const UPDATE_HAR = process.env.E2E_UPDATE_HAR === '1';

/** @typedef {import('@playwright/test').Page} Page */

/** Pathname hiện tại. @param {Page} page */
const pathOf = (page) => new URL(page.url()).pathname;

/** Chiều cao (px) của ô ảnh. @param {import('@playwright/test').Locator} image */
async function heightOf(image) {
  const box = await image.boundingBox();
  return box?.height ?? 0;
}

test.describe('Network mocking nâng cao', () => {
  test(
    'TC-11 failOnce: lỗi ở các lần đầu, "Try Again" thì tải được',
    { tag: ['@regression', '@mock'] },
    async ({ page, productListPage: list }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium', 'kiểm helper, một trình duyệt là đủ');
      const requests = countRequests(page, LIST_URL, { method: 'GET' });
      // Query danh sách có `retry: 1` (frontend) → lần tải đầu gồm 2 request, cả hai phải lỗi
      const flaky = failOnce(500, undefined, { times: 2 });
      await page.route(LIST_URL, flaky);

      await list.goto();
      await expect(list.loadError).toBeVisible();
      expect(flaky.calls).toBe(2);

      await list.retryButton.click();
      await expect(list.cards).toHaveCount(CATALOG_PAGE_SIZE);
      expect(flaky.calls).toBe(3);
      expect(requests.count).toBe(3);
    }
  );

  test(
    'TC-12 mất ảnh sản phẩm: bố cục giữ nguyên, vẫn mua được',
    { tag: ['@regression', '@mock'] },
    async ({ page, homePage, productListPage: list, productDetailPage: pdp, cartPage: cart }) => {
      const errors = collectPageErrors(page);
      const images = countRequests(page, PRODUCT_IMAGE);
      await page.route(PRODUCT_IMAGE, abortRoute);
      const vomero = seedBySlug('nike-vomero-18');

      await test.step('trang chủ: "Just In" vẫn có tên + giá, ô ảnh không xẹp', async () => {
        await homePage.goto();
        await expect(homePage.newArrivalCards).toHaveCount(expectedNewArrivals().length);
        const first = homePage.newArrivalCards.first();
        await expect(first.getByTestId('product-name')).not.toBeEmpty();
        await expect(first.getByTestId('product-price')).not.toBeEmpty();
        expect(await heightOf(first.getByRole('img'))).toBeGreaterThan(0);
      });

      await test.step('/w: 12 thẻ, ô ảnh giữ chiều cao', async () => {
        await list.goto();
        await expect(list.cards).toHaveCount(CATALOG_PAGE_SIZE);
        await expect(list.cards.getByTestId('product-name')).toHaveText(
          expectedList({}).items.map((i) => i.name)
        );
        for (const i of [0, CATALOG_PAGE_SIZE - 1]) {
          expect(await heightOf(list.card(i).image), `ảnh thẻ ${i}`).toBeGreaterThan(0);
        }
      });

      await test.step('/t: tên + giá, Add to Bag mở popup', async () => {
        await pdp.goto(vomero.slug);
        await expect(pdp.heading).toHaveText(vomero.name);
        await expect(pdp.price).toHaveText(formatVnd(vomero.price));
        await pdp.addSize('EU 39');
        await expect(pdp.addedToBag.title).toBeVisible();
      });

      await test.step('/cart: 1 dòng', async () => {
        await cart.goto();
        await expect(cart.items).toHaveCount(1);
        await expect(cart.item(0).name).toHaveText(vomero.name);
      });

      expect(images.count, 'trang có tải ảnh sản phẩm (đều bị chặn)').toBeGreaterThan(0);
      expect(errors).toEqual([]);
    }
  );

  test(
    'TC-14 mạng chậm thật (CDP): skeleton hiện trước, sau đó đủ thẻ',
    { tag: ['@regression', '@mock'] },
    async ({ page, homePage, productListPage: list }, testInfo) => {
      test.skip(
        testInfo.project.name !== 'chromium',
        'CDP Network.emulateNetworkConditions chỉ có ở Chromium'
      );
      test.setTimeout(90_000);
      const errors = collectPageErrors(page);

      // Vite dev phục vụ hàng trăm module chưa đóng gói: bật throttle sau khi app đã tải (trang thông tin
      // không gọi API sản phẩm), rồi điều hướng trong app để chỉ API + ảnh đi qua mạng chậm
      await page.goto('/info/help', { waitUntil: 'load' });
      await expect(homePage.header.logo).toBeVisible();
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false,
        // Độ trễ cao để thấy rõ trạng thái đang tải; băng thông ~1,6 Mbps (gần "Fast 3G"): mức 500 kbps của
        // "Slow 3G" bị ảnh sản phẩm trang chủ chiếm hết, request API xếp hàng sau ảnh hàng chục giây
        latency: 1500,
        downloadThroughput: (1600 * 1024) / 8,
        uploadThroughput: (750 * 1024) / 8,
      });

      await test.step('trang chủ: skeleton "Just In" rồi đủ thẻ', async () => {
        await homePage.header.logo.click();
        await expect.poll(() => pathOf(page)).toBe('/');
        await expect(homePage.newArrivals).toHaveAttribute('aria-busy', 'true');
        await expect(homePage.newArrivals.locator('[data-slot="skeleton"]').first()).toBeVisible();
        await expect(homePage.newArrivalCards).toHaveCount(expectedNewArrivals().length, {
          timeout: 20_000,
        });
      });

      await test.step('/w: lưới skeleton (aria-busy) rồi 12 thẻ', async () => {
        await homePage.header.navLink('Men').click();
        await expect.poll(() => pathOf(page)).toBe('/w');
        await expect(list.skeletons.first()).toBeVisible({ timeout: 20_000 });
        await expect(list.cards).toHaveCount(CATALOG_PAGE_SIZE, { timeout: 20_000 });
      });

      await cdp.detach();
      expect(errors).toEqual([]);
    }
  );

  test(
    'TC-15 phát lại HAR: /w chạy không cần backend',
    { tag: ['@regression', '@mock'] },
    async ({ page, productListPage: list }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium', 'HAR ghi bằng Chromium');
      test.skip(!UPDATE_HAR && !fs.existsSync(HAR_FILE), 'chưa có HAR: chạy với E2E_UPDATE_HAR=1');

      /** @type {string[]} */
      const apiUrls = [];
      /** @type {string[]} */
      const failed = [];
      page.on('requestfinished', (req) => {
        if (ANY_API.test(req.url())) apiUrls.push(req.url());
      });
      page.on('requestfailed', (req) => {
        if (ANY_API.test(req.url())) failed.push(req.url());
      });
      await page.routeFromHAR(HAR_FILE, {
        url: ANY_API,
        notFound: 'abort',
        update: UPDATE_HAR,
        updateContent: 'embed',
        updateMode: 'minimal',
      });

      await list.goto();
      await expect(list.cards.getByTestId('product-name')).toHaveText(
        expectedList({}).items.map((i) => i.name)
      );
      await list.applyFilters([['gender', 'men']]);
      await expect(list.heading).toHaveText("Men's Shoes (12)");
      await expect(list.cards.getByTestId('product-name')).toHaveText(
        expectedList({ gender: 'men' }).items.map((i) => i.name)
      );
      // HAR chỉ ghi xuống đĩa khi đóng context
      if (UPDATE_HAR) await page.context().close();

      expect(failed, 'request /api/** không có trong HAR (bị abort)').toEqual([]);
      if (!UPDATE_HAR) {
        /** @type {{ log: { entries: { request: { url: string } }[] } }} */
        const har = JSON.parse(fs.readFileSync(HAR_FILE, 'utf8'));
        const recorded = new Set(har.log.entries.map((e) => e.request.url));
        expect(apiUrls.length).toBeGreaterThan(0);
        for (const url of apiUrls) expect(recorded, `${url} lấy từ HAR`).toContain(url);
      }
    }
  );
});

test.describe('Chậm toàn tuyến @stock', () => {
  test.use({ storageState: storageStateOf('khach1') });

  test(
    'TC-13 mọi /api/** trễ 800 ms: đi trọn luồng mua',
    { tag: ['@regression', '@mock'] },
    async (
      {
        page,
        productDetailPage: pdp,
        cartPage: cart,
        checkoutPage: checkout,
        orderResultPage: result,
        apiAs,
      },
      testInfo
    ) => {
      test.skip(testInfo.project.name === MOBILE, 'luồng desktop');
      test.setTimeout(90_000);
      const flow = flowOf('TC13', testInfo);
      await (await apiAs('admin')).testSupport.setStockOk(flow.sizeId, FLOW_STOCK);
      const errors = collectPageErrors(page);
      const creates = countRequests(page, CREATE_URL, { method: 'POST' });
      await page.route(ANY_API, delayed(800));

      // `/t/$slug` tải bằng loader của router: khung xương chỉ hiện khi chờ quá `pendingMs` (1 giây) nên
      // với trễ 800 ms trang hiện thẳng nội dung — không kiểm khung xương ở bước này
      await test.step('chi tiết: hiện nội dung', async () => {
        await pdp.goto(flow.slug);
        await expect(pdp.heading).toHaveText(flow.name);
        await pdp.addSize(flow.sizeLabel);
        await pdp.addedToBag.viewBagWith(1).click();
      });

      await test.step('giỏ: khung xương rồi 1 dòng', async () => {
        await expect.poll(() => pathOf(page)).toBe('/cart');
        await expect(cart.skeleton).toHaveAttribute('aria-busy', 'true');
        await expect(cart.items).toHaveCount(1);
        await cart.checkout.click();
      });

      await test.step('checkout: khung xương, điền, "Placing Order…" bị khoá', async () => {
        await expect.poll(() => pathOf(page)).toBe('/checkout');
        // Giỏ đã có trong cache (từ /cart) nên không có khung xương; trang vẫn đối soát lại → vùng `aria-busy`
        await expect(checkout.main.locator('[aria-busy="true"]').first()).toBeVisible();
        await expect(checkout.items).toHaveCount(1);
        await checkout.fillDelivery(DELIVERY);
        await checkout.placeOrder.click();
        await expect(checkout.placeOrder).toHaveText('Placing Order…');
        await expect(checkout.placeOrder).toBeDisabled();
      });

      await expect
        .poll(() => pathOf(page), { timeout: 15_000 })
        .toMatch(/^\/checkout\/result\/DH\d{10}$/);
      await expect(result.heading).toHaveText('Thank you for your order');
      expect(creates.count).toBe(1);
      expect(errors).toEqual([]);
    }
  );
});
