# Tài liệu học: automation test với Playwright + JavaScript qua bộ test của đồ án

Tài liệu giải thích các khái niệm dùng trong `automation/`, mỗi khái niệm kèm đoạn code thật trong repo để đọc tiếp. Đọc theo thứ tự từ mục 1; mục nào cũng ghi file nên mở.

Cách cài và chạy: [huong-dan-cai-dat-va-chay.md](huong-dan-cai-dat-va-chay.md).

## 1. Playwright là gì, vì sao chọn

Playwright (Microsoft) là thư viện điều khiển trình duyệt thật qua giao thức riêng của từng engine. Một API dùng được cho **Chromium, Firefox và WebKit** (nhân của Safari), và cho cả gọi HTTP thuần (test API).

| Điểm | Ý nghĩa với đồ án |
|---|---|
| **Auto-wait** | trước khi bấm, Playwright tự chờ phần tử hiện, ổn định, bật; không cần `sleep` |
| **Web-first assertion** | `await expect(locator).toHaveText(...)` tự thử lại tới khi đúng hoặc hết 10 giây |
| **Đa trình duyệt + giả lập điện thoại** | một bộ test chạy trên 4 cấu hình (Desktop Chrome / Firefox / Safari, Pixel 7) |
| **Test runner đi kèm** | song song, retry, tag, báo cáo HTML, trace, video sẵn có |
| **Chặn và sửa request** | `page.route()` giả lập lỗi server, mạng chậm, mất mạng (mục 9) |
| **APIRequestContext** | gọi REST trong cùng bộ test, dùng để chuẩn bị dữ liệu và kiểm hậu trạng thái |

So với Selenium: không cần WebDriver riêng cho từng trình duyệt, không phải tự viết chờ, có trace viewer. So với Cypress: chạy được WebKit và Firefox ổn định, nhiều tab, nhiều context, không bị giới hạn một domain.

## 2. Cấu trúc một test

```js
import { expect, test } from '../../fixtures/index.js';

test.describe('Chức vụ', () => {
  test('TC-14 tạo chức vụ mới', { tag: '@smoke' }, async ({ rolePage }, testInfo) => {
    // Arrange → Act → Assert
  });
});
```

- `test.describe` gom nhóm; `test(...)` là một ca kiểm thử.
- **Tiêu đề bắt đầu bằng ID test case** (`TC-14`) để truy ngược về plan §9 và ma trận truy vết.
- `{ tag: '@smoke' }`: phân loại để chọn chạy (mục 8).
- Tham số `{ rolePage }` là **fixture**: Playwright tự tạo trước test, tự dọn sau test (mục 5).
- `test.step('tên chặng', async () => …)` chia test dài thành chặng, hiện riêng trên báo cáo. Ví dụ: [tests/e2e-flows/kiem-thu-hoi-quy.spec.js](../../automation/tests/e2e-flows/kiem-thu-hoi-quy.spec.js).

## 3. Locator: tìm phần tử thế nào cho bền

Locator là "cách tìm" phần tử, được tính lại mỗi lần dùng nên không bị "stale" như Selenium. Thứ tự ưu tiên trong đồ án:

1. **Theo vai trò + tên truy cập** như người dùng / trình đọc màn hình thấy:
   `page.getByRole('button', { name: 'Try Again', exact: true })`
2. **Theo nhãn / chữ**: `getByLabel('Email')`, `getByText("Couldn't load your bag.")`
3. **Theo `data-testid`** khi không có tên ổn định: `page.getByTestId('cart-subtotal')`
4. CSS / id chỉ khi không còn cách khác: `page.locator('#pdp-size-label')`

Locator có thể **lồng nhau** để thu hẹp phạm vi: `this.related.getByTestId('product-card')` chỉ tìm thẻ trong khối "You Might Also Like".

Ví dụ đầy đủ: [pages/ProductDetailPage.js](../../automation/pages/ProductDetailPage.js), [pages/CartPage.js](../../automation/pages/CartPage.js).

## 4. Page Object Model (POM)

Mỗi trang (hoặc thành phần lặp lại như header, thẻ sản phẩm, hộp thoại) là một lớp JS giữ **locator** và **thao tác nghiệp vụ** của trang đó. Spec chỉ mô tả bước và khẳng định, **không chứa selector**.

```js
// pages/CartPage.js (rút gọn)
export class CartPage extends BasePage {
  path = '/cart';
  constructor(page) {
    super(page);
    this.subtotal = page.getByTestId('cart-subtotal');
    this.total = page.getByTestId('cart-total');
    this.checkout = page.getByTestId('cart-checkout');
  }
  async expectSummary({ subtotal, shipping, total, hint }) {
    await expect(this.subtotal).toHaveText(subtotal);
    // ...
  }
  item(i) { return new CartItem(this.items.nth(i)); }   // đối tượng con cho từng dòng giỏ
}
```

Lợi ích: giao diện đổi (vd đổi `data-testid`) thì sửa **một chỗ** trong page object, mọi spec dùng nó vẫn chạy.

Trong repo: 15 page object ở [automation/pages/](../../automation/pages/), thành phần dùng chung ở `pages/components/` (`HeaderComponent`, `ProductCard`, `AddedToBagDialog`, `SizeGuideDialog`…). Lớp cha [BasePage.js](../../automation/pages/BasePage.js) có `goto()`, `isMobile`, toast.

## 5. Fixture: tiêm sẵn đối tượng cho test

Fixture là cơ chế "dependency injection" của Playwright Test. Đồ án mở rộng `test` gốc ở [fixtures/index.js](../../automation/fixtures/index.js):

```js
export const test = base.extend({
  // tạo page object cho mỗi test
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  // API client chưa đăng nhập
  api: async ({ request }, use) => {
    await use(createApi(request));
  },
  // API client đã đăng nhập theo vai trò; token lấy một lần cho mỗi worker
  apiAs: async ({ request, tokenCache }, use) => {
    await use(async (role) => createApi(request, await tokenCache.get(role)));
  },
  tokenCache: [async ({ playwright }, use) => { /* ... */ }, { scope: 'worker' }],
});
```

- Phần trước `use(...)` là **setup**, phần sau là **teardown**.
- `scope: 'worker'`: tạo một lần cho mỗi tiến trình worker (ở đây là cache token), thay vì mỗi test.
- Mọi spec import `test`, `expect` từ `fixtures/index.js`, không import thẳng `@playwright/test`.

## 6. Test API và API client

Project `api` chạy các file `tests/api/*.api.spec.js`: không mở trình duyệt, chỉ gửi HTTP qua `APIRequestContext`. Nhanh (146 test khoảng 20 giây) nên phủ hết hợp đồng API và mọi mã lỗi.

[api/ApiClient.js](../../automation/api/ApiClient.js) bọc request và có hai khẳng định chung theo định dạng trả về của backend:

```js
async expectOk(res) {                       // HTTP 200 + code 200 → trả result
  const body = await res.json();
  expect(res.status()).toBe(200);
  expect(body?.code).toBe(200);
  return body.result;
}
async expectError(res, status, message) {   // đúng mã lỗi + message nguyên văn
  // ...
}
```

Mỗi nhóm nghiệp vụ có một client riêng: `AuthApi`, `ProductApi`, `CartApi`, `OrderApi`, `TestSupportApi`… gom lại ở `api/index.js`. Dùng trong test:

```js
test('TC-01 kiểm tra giỏ nhiều trạng thái', { tag: '@smoke' }, async ({ api }) => {
  const result = await api.client.expectOk(await api.cart.check(body));
  expect(normalizeCheck(result)).toEqual(expectedCartCheck(items));
});
```

**API còn dùng trong test giao diện** để chuẩn bị dữ liệu (đặt tồn kho, tạo chức vụ) và kiểm lại kết quả sau thao tác UI (đơn đã lưu, kho đã trừ). Cách này nhanh và ổn định hơn đi qua giao diện cho mọi bước.

## 7. Đăng nhập một lần: `storageState`

Đăng nhập qua form ở mỗi test vừa chậm vừa dễ chập chờn. Project `setup` ([tests/auth.setup.js](../../automation/tests/auth.setup.js)) đăng nhập **một lần** cho từng vai trò rồi lưu cookie + localStorage ra file `.auth/<vai-trò>.json`:

```js
setup(`đăng nhập sẵn: ${role}`, async ({ page, loginPage }) => {
  await loginPage.goto();
  await loginPage.login(accounts[role]);
  await expect(page).toHaveURL(/\/admin\/?$/);
  await page.context().storageState({ path: storageStateOf(role) });
});
```

Spec cần đăng nhập chỉ khai báo `test.use({ storageState: storageStateOf('admin') })`. Các project trình duyệt có `dependencies: ['setup']` nên `setup` luôn chạy trước.

## 8. Cấu hình, project, tag và hai pha

[playwright.config.js](../../automation/playwright.config.js) định nghĩa:

| Mục | Giá trị | Ý nghĩa |
|---|---|---|
| `projects` | `setup`, `api`, `chromium`, `firefox`, `webkit`, `mobile-chrome` | một spec giao diện chạy trên 4 trình duyệt |
| `webServer` | `pnpm --dir ../frontend dev` | Playwright tự bật frontend nếu chưa chạy |
| `globalSetup` | `global-setup.js` | kiểm backend sống + reset dữ liệu trước khi chạy |
| `use.trace` / `screenshot` / `video` | giữ khi lỗi | bằng chứng để điều tra |
| `use.locale`, `timezoneId` | `vi-VN`, `Asia/Ho_Chi_Minh` | định dạng tiền / ngày giống người dùng thật |
| `workers` | 4 (local), 2 (CI) | số test chạy song song |
| `retries` | 0 (local), 2 (CI) | |

**Tag** chọn nhóm test (kiểm tự động bằng `pnpm check:tags`):

| Tag | Ý nghĩa |
|---|---|
| `@smoke` | đường chính, chạy trên CI mỗi lần push |
| `@regression` | mọi ca còn lại (mỗi test có đúng một trong hai tag này) |
| `@stock` | tạo đơn / đổi tồn kho, chạy ở pha riêng |
| `@flow` | luồng mua hàng xuyên nhiều chức năng |
| `@mock` | test có giả lập mạng |

**Hai pha**: nhiều test so tồn kho chính xác với dữ liệu gốc, còn test đặt hàng thì trừ kho. Chạy chung sẽ chập chờn, nên [scripts/run-phases.mjs](../../automation/scripts/run-phases.mjs) chạy pha thường (`grepInvert: /@stock/`) rồi pha `@stock` (`E2E_STOCK=1`), mỗi pha reset dữ liệu riêng. Trong pha stock, mỗi trình duyệt dùng một size giày riêng (`laneOf(testInfo)` ở `utils/lane.js`) để 4 trình duyệt chạy song song không giẫm tồn kho của nhau.

## 9. Kỹ thuật thiết kế test case trong bộ test

| Kỹ thuật | Ở đâu | Ví dụ |
|---|---|---|
| **Phân vùng tương đương + giá trị biên** | [data/role-names.json](../../automation/data/role-names.json) | tên chức vụ 1 / 50 / 51 ký tự |
| **Data-driven** (một test, nhiều bộ dữ liệu) | [data/catalog-filters.json](../../automation/data/catalog-filters.json), `register-invalid.json`, `checkout-form-invalid.json` | 24 ca bộ lọc chạy cả qua API lẫn giao diện |
| **Kết quả mong đợi tính từ dữ liệu gốc** | [data/seed-products.js](../../automation/data/seed-products.js) | `expectedList(filter)`, `expectedCartCheck(items)` đọc `products.json`, không chép tay con số |
| **Bảng quyết định / phân quyền** | `tests/admin/`, `tests/api/role.api.spec.js` | admin thấy, `noaccess` bị từ chối |
| **Kiểm thử luồng (end-to-end)** | `tests/e2e-flows/` | tìm → lọc → xem → giỏ → đăng nhập → đặt COD, chặng cuối kiểm qua API |
| **Kiểm thử hồi quy** | `pnpm test:regression`, `pnpm test` | chạy lại toàn bộ sau mỗi lát chức năng |
| **Kiểm thử đa trình duyệt / thiết bị** | 4 project giao diện | Pixel 7 kiểm menu mobile, ngăn kéo "Filter" |

Ví dụ data-driven ([tests/product-list/kiem-thu-hoi-quy.spec.js](../../automation/tests/product-list/kiem-thu-hoi-quy.spec.js)):

```js
for (const c of filterCases) {
  test(`TC-06 ${c.case}`, { tag: '@regression' }, async ({ page, productListPage, api }) => {
    // áp bộ lọc c.ui trên giao diện, so số thẻ và tên với expectedList(c.filter)
  });
}
```

## 10. Network mocking: giả lập tình huống khó tạo bằng tay

Playwright chặn được mọi request của trang. Hàm dùng chung ở [utils/network.js](../../automation/utils/network.js):

| Tình huống | Code | Test minh hoạ |
|---|---|---|
| Server lỗi 500 | `page.route(apiPath('/cart/public/check'), fail500)` | khối "Couldn't load your bag." + nút "Try Again" |
| Lỗi vài lần đầu rồi bình thường | `failOnce(status, body, { times })` | TC-11; luồng hết phiên TC-05a (401 → refresh token → gửi lại) |
| Mất ảnh / mất mạng một request | `route.abort('failed')` | TC-12 mất ảnh vẫn mua được |
| API trễ | `delayed(800)` rồi `route.fallback()` | TC-13 cả luồng mua với mọi API trễ 800 ms |
| Tắt mạng cả trình duyệt | `context.setOffline(true)` | TC-04 mất mạng lúc "Place Order", có mạng lại chỉ tạo đúng 1 đơn |
| Mạng chậm thật | CDP `Network.emulateNetworkConditions` (chỉ Chromium) | TC-14 skeleton hiện trước rồi đủ thẻ |
| Phát lại HAR (không cần backend) | `page.routeFromHAR('data/har/catalog.har', …)` | TC-15 trang `/w` chạy với dữ liệu ghi sẵn |
| Đếm request | `countRequests(page, pattern, { method })` | chắc chắn chỉ gửi 1 request tạo đơn |

```js
// tests/cart/gio-hang.spec.js, TC-23: API giỏ trả 500 → hiện lỗi; gỡ chặn, bấm "Try Again" → tải được
await page.route(CHECK_URL, fail500);
await cart.goto();
await expect(cart.error).toBeVisible();
await expect(cart.tryAgain).toBeVisible();
await page.unroute(CHECK_URL);
await cart.tryAgain.click();
await expect(cart.items).toHaveCount(1);
```

Hai lỗi thật của frontend được phát hiện nhờ nhóm này (mất mạng khi đặt hàng, refresh token hết hạn); xem [docs/chuc-nang/kiem-thu-hoi-quy.md](../chuc-nang/kiem-thu-hoi-quy.md).

## 11. Dữ liệu test độc lập và dọn dẹp

- `global-setup.js` gọi `POST /test-support/reset` trước mỗi pha: dữ liệu cửa hàng về đúng `products.json`.
- Dữ liệu tạo trong test dùng `uniqueName()` / `uniqueEmail()` ([utils/unique.js](../../automation/utils/unique.js), tiền tố `AUTO-`) để chạy song song không trùng; dọn ở `afterEach` / `finally`.
- Đặt tồn kho đầu test bằng `testSupport.setStockOk(sizeId, n)` thay vì tin vào trạng thái test trước để lại.
- Không dùng `page.waitForTimeout`. Chờ theo trạng thái: `expect(...).toBeVisible()`, `expect.poll(() => …)`.

## 12. Gỡ lỗi khi test đỏ

| Công cụ | Lệnh | Dùng khi |
|---|---|---|
| Báo cáo HTML | `pnpm report` | xem test nào đỏ, lỗi gì, ảnh + video lúc lỗi |
| Trace Viewer | `pnpm exec playwright show-trace <trace.zip>` | tua lại từng thao tác: DOM trước / sau, request, console |
| UI Mode | `pnpm test:ui` | chạy lại một test, xem theo thời gian, chọn locator |
| Chạy có cửa sổ, chậm | `E2E_SLOWMO=400 … --headed --workers=1` | quan sát bằng mắt |
| Debug từng bước | `pnpm exec playwright test <spec> --debug` | dừng ở mỗi thao tác, mở Playwright Inspector |
| Sinh code / tìm locator | `pnpm exec playwright codegen http://localhost:4500` | bấm trên web, Playwright gợi ý locator |

## 13. Báo cáo và CI

- **Playwright HTML**: có sẵn, gồm `test.step`, tệp đính kèm, trace. Mỗi pha một báo cáo; `pnpm report:all` gộp hai pha (reporter `blob` + `playwright merge-reports`) thành `playwright-report-all/`.
- **Bảng số liệu**: `pnpm report:summary` đọc `results.json` của báo cáo gộp, in bảng Markdown theo project / khu vực / tag + danh sách test lỗi / chập chờn (trên CI ghi vào job summary).
- **Allure** (`allure-playwright`): báo cáo tổng hợp kiểu dashboard cho quyển báo cáo; `pnpm allure:generate && pnpm allure:open`. Có Trend (giữ lịch sử giữa các lần sinh), Environment, Categories (nhóm lỗi), Behaviors (epic = lát) gắn tự động bằng auto fixture `allureLabels`.
- **GitHub Actions**: [e2e-smoke.yml](../../.github/workflows/e2e-smoke.yml) chạy `@smoke` trên 5 project mỗi lần push (bỏ qua commit chỉ sửa tài liệu); [e2e-regression.yml](../../.github/workflows/e2e-regression.yml) chạy toàn bộ mỗi đêm 02:00 theo ma trận 4 trình duyệt rồi gộp báo cáo. Hạ tầng dựng bằng composite action `.github/actions/setup-sut`; frontend chạy bản build (`vite preview`).

## 14. Số liệu bộ test (20/11/2026)

Lấy từ `pnpm check:tags` (đếm theo project, nghĩa là một test giao diện chạy 4 trình duyệt được đếm 4 lần):

| Project | Tổng | Smoke | Regression | Stock | Flow | Mock |
|---|---|---|---|---|---|---|
| api | 146 | 22 | 124 | 16 | 0 | 0 |
| chromium | 225 | 24 | 201 | 17 | 6 | 8 |
| firefox | 225 | 24 | 201 | 17 | 6 | 8 |
| webkit | 225 | 24 | 201 | 17 | 6 | 8 |
| mobile-chrome | 225 | 24 | 201 | 17 | 6 | 8 |
| **Tổng** | **1046** | **118** | **928** | **84** | **24** | **32** |

Thành phần: 26 file spec, 15 page object, 9 API client, 21 file dữ liệu test + 1 file HAR.

## 15. Lộ trình tự học gợi ý

1. Đọc [playwright.config.js](../../automation/playwright.config.js) và chạy `pnpm test:ui` để thấy danh sách test.
2. Đọc một spec ngắn: [tests/admin/role.spec.js](../../automation/tests/admin/role.spec.js) + page object [pages/RolePage.js](../../automation/pages/RolePage.js).
3. Đọc test API: [tests/api/gio-hang.api.spec.js](../../automation/tests/api/gio-hang.api.spec.js) + [api/ApiClient.js](../../automation/api/ApiClient.js).
4. Đọc [fixtures/index.js](../../automation/fixtures/index.js) và [tests/auth.setup.js](../../automation/tests/auth.setup.js).
5. Đọc luồng xuyên suốt [tests/e2e-flows/kiem-thu-hoi-quy.spec.js](../../automation/tests/e2e-flows/kiem-thu-hoi-quy.spec.js), chạy TC-01 có giao diện.
6. Đọc [utils/network.js](../../automation/utils/network.js) và [tests/network/kiem-thu-hoi-quy.spec.js](../../automation/tests/network/kiem-thu-hoi-quy.spec.js).
7. Bài tập: dùng `codegen` ghi một thao tác trên trang `/w`, rồi chuyển code sinh ra thành một method trong `ProductListPage` và một test mới có ID + tag; chạy `pnpm check:tags` và `pnpm lint`.

Tài liệu chính thức: https://playwright.dev/docs/intro (Getting started), https://playwright.dev/docs/locators, https://playwright.dev/docs/test-fixtures, https://playwright.dev/docs/network, https://playwright.dev/docs/trace-viewer.
