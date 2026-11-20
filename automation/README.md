# Bộ automation test — cửa hàng giày (Playwright + JavaScript)

Bộ kiểm thử tự động của đồ án, viết bằng **JavaScript (ES module)** trên **Playwright Test 1.63**. Kiểm thử cả hai tầng:

- **API** (REST backend Spring Boot ở `:9500/api`) — không mở trình duyệt, chạy nhanh, phủ hợp đồng và mọi mã lỗi.
- **Giao diện** (frontend React ở `:4500`) — theo mô hình **Page Object Model**, chạy trên Chromium, Firefox, WebKit và điện thoại giả lập (Pixel 7).

## 1. Cài đặt

Yêu cầu: Node ≥ 20, pnpm, Java 21 (để sinh báo cáo Allure), Docker (MySQL + MinIO).

```bash
cd automation
pnpm install
pnpm exec playwright install          # tải Chromium, Firefox, WebKit
cp .env.example .env                  # tuỳ chọn: đổi địa chỉ / tài khoản
```

Trước khi chạy test: hạ tầng + backend phải chạy (frontend Playwright tự bật bằng `pnpm --dir ../frontend dev` nếu chưa có):

```bash
docker compose -f docker-compose.local.yml --env-file backend/.env up -d   # ở gốc repo
sh scripts/ai/backend-restart.sh                                            # backend :9500
```

Backend chưa chạy thì `global-setup.js` dừng ngay với thông báo
`Backend chưa chạy ở http://localhost:9500 — chạy: sh scripts/ai/backend-restart.sh`, không chạy test nào.

## 2. Chạy test

| Lệnh                                                            | Việc                                                                        |
| --------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `pnpm test`                                                     | Toàn bộ: project `api` + 4 project giao diện, hai pha (thường rồi `@stock`) |
| `pnpm test:smoke`                                               | Chỉ test gắn tag `@smoke` (luồng chính), mọi project, hai pha               |
| `pnpm test:regression`                                          | Chỉ test gắn tag `@regression`, hai pha                                     |
| `pnpm test:api`                                                 | Chỉ nhóm API (không bật frontend), hai pha                                  |
| `pnpm test:stock`                                               | Chỉ pha `@stock` (test tạo đơn / đổi tồn kho)                               |
| `pnpm test:flows`                                               | Chỉ luồng xuyên suốt `@flow` (`tests/e2e-flows/`, mục 7)                    |
| `pnpm test:mock`                                                | Chỉ test network mocking `@mock` (mục 8)                                    |
| `pnpm check:tags`                                               | Kiểm tag + ID của mọi test, in bảng thống kê (mục 9) — không chạy test      |
| `pnpm test:headed`                                              | Chromium có giao diện, 1 worker                                             |
| `pnpm test:ui`                                                  | Chế độ UI của Playwright (chọn test, xem từng bước)                         |
| `pnpm exec playwright test tests/admin/role.spec.js -g "TC-14"` | Chạy một test theo ID                                                       |
| `pnpm lint`                                                     | ESLint (`eslint-plugin-playwright`) cho code test                           |

Local mặc định **4 worker** (`E2E_WORKERS=<n>` để đổi): mọi trình duyệt cùng lấy module từ một tiến trình Vite dev,
để mặc định của Playwright (nửa số nhân) thì `goto` của Firefox / WebKit có lúc quá 30 giây.

Truyền thêm cờ cho Playwright (`--reporter`, `--headed`…) thì dùng `pnpm exec playwright test …` hoặc các script có dấu `:`; riêng `pnpm test` của pnpm 12 tự hiểu một số cờ (vd `--reporter`) là cờ của pnpm.

Xem luồng bằng mắt (chậm 0,4 giây mỗi thao tác):

```bash
E2E_SLOWMO=400 pnpm exec playwright test tests/admin --project=chromium --headed --workers=1
```

Chụp ảnh cho tài liệu chức năng: đặt `E2E_DOC_SHOTS=../docs/chuc-nang/img/<slug>`; hàm `docShot()` chỉ chụp ở project `chromium`.

### Hai pha: thường và `@stock` (từ lát `dat-hang`)

Nhiều spec so tồn kho chính xác với `products.json` (`totalStock`, tồn từng size…), còn test tạo đơn thì trừ kho.
Để không chập chờn, `pnpm test*` chạy qua `scripts/run-phases.mjs`: **pha thường** (mọi test trừ `@stock`) rồi
**pha stock** (`E2E_STOCK=1`, chỉ `@stock`); mỗi pha có global-setup reset dữ liệu riêng. Pha 2 vẫn chạy khi pha 1
đỏ; mã thoát ≠ 0 nếu một pha đỏ; `--phase=main|stock` chỉ chạy một pha. Pha stock ghi `test-results-stock/` và
`playwright-report-stock/` (`pnpm report:stock`), Allure dùng chung `allure-results/`.

- Test tạo đơn / đổi tồn kho **phải** nằm trong `test.describe('… @stock')`; mỗi test dùng size riêng và đặt lại tồn kho
  bằng `testSupport.setStockOk(sizeId, n)` ở đầu test. Test giao diện cần đặt tồn kho dùng size theo project
  (`laneOf(testInfo)` ở `utils/lane.js`) để 4 trình duyệt không giẫm nhau.
- `pnpm exec playwright test` gọi thẳng chỉ chạy pha thường; chạy riêng một spec `@stock`:

```bash
E2E_STOCK=1 E2E_SLOWMO=400 pnpm exec playwright test tests/checkout/dat-hang.spec.js --project=chromium --headed --workers=1
```

## 3. Báo cáo

| Báo cáo                                     | Lệnh                                          | Vị trí                                         |
| ------------------------------------------- | --------------------------------------------- | ---------------------------------------------- |
| Playwright HTML (trace, ảnh, video khi lỗi) | `pnpm report`                                 | `playwright-report/index.html`                 |
| Playwright HTML của pha `@stock`            | `pnpm report:stock`                           | `playwright-report-stock/index.html`           |
| Allure                                      | `pnpm allure:generate` rồi `pnpm allure:open` | `allure-results/` → `allure-report/index.html` |

Khi test lỗi Playwright giữ lại **trace** (`trace: retain-on-failure`), **ảnh chụp** và **video**; mở trace bằng `pnpm exec playwright show-trace <file trace.zip>`.

## 4. Cấu trúc thư mục

```
automation/
├─ playwright.config.js      cấu hình: baseURL, 6 project, reporter list + html + allure, webServer, slowMo
├─ global-setup.js           kiểm backend sống trước khi chạy (dừng sớm nếu không)
├─ .env.example              BASE_URL, API_URL, tài khoản, E2E_SLOWMO, E2E_DOC_SHOTS
├─ api/                      API client
│  ├─ ApiClient.js           bọc request: ghép API_URL, gắn Bearer token, expectOk / expectError
│  ├─ AuthApi.js             đăng nhập, refresh, logout
│  ├─ AccountApi.js          đăng ký, account/me
│  ├─ RoleApi.js             CRUD chức vụ + dọn dữ liệu AUTO-
│  ├─ ProductApi.js  CartApi.js  OrderApi.js  TestSupportApi.js   sản phẩm, giỏ, đơn, reset / đặt tồn kho
│  └─ index.js               createApi(request, token) gom các client
├─ pages/                    Page Object Model
│  ├─ BasePage.js            goto, isMobile, toast
│  ├─ AdminLoginPage.js      /login
│  ├─ AdminLayout.js         khung /admin: thanh bên, lời chào, trang từ chối truy cập
│  ├─ RolePage.js            /admin/chuc-vu: tìm, thêm, sửa, xoá theo dòng
│  └─ components/            RoleDialog, DeleteConfirmDialog
├─ fixtures/index.js         test = base.extend({ api, apiAs, loginPage, adminLayout, rolePage })
├─ data/                     dữ liệu kiểm thử
│  ├─ accounts.js            tài khoản theo vai trò (đọc env), đường dẫn storageState
│  ├─ register-invalid.json  bảng dữ liệu đăng ký sai (data-driven TC-06 → TC-09)
│  ├─ catalog-filters.json   24 ca bộ lọc: `filter` / `total` / `ids` (API) + `ui` (cách bấm trên giao diện)
│  ├─ flows.js               làn size theo project + sản phẩm của các luồng xuyên suốt (`flowOf`)
│  ├─ har/catalog.har        HAR API trang /w cho phát lại (ghi lại: E2E_UPDATE_HAR=1)
│  └─ role-names.json        giá trị biên tên chức vụ (1 / 50 / 51 ký tự)
├─ utils/                    unique (email / tên duy nhất), format (tiền VNĐ), jwt, doc-shot, env, lane (size theo project),
│                            cart-storage (giỏ localStorage), network (helper network mocking, mục 8)
├─ scripts/                  run-phases.mjs (hai pha), check-tags.mjs (quy tắc tag, mục 9)
└─ tests/
   ├─ auth.setup.js          project `setup`: đăng nhập UI admin / noaccess → .auth/<vai-trò>.json
   ├─ api/                   *.api.spec.js — project `api`
   ├─ admin/                 trang quản trị
   ├─ e2e-flows/             luồng xuyên suốt nhiều lát (`@flow`, mục 7)
   ├─ network/               network mocking nâng cao (`@mock`, mục 8)
   ├─ home/ product-list/ product-detail/ cart/ checkout/ account/ system/   spec giao diện từng lát
   ├─ visual/  a11y/         (để dành cho lát 4.2, xem README trong từng thư mục)
```

### Project

| Project                           | Chạy gì                                        | Trình duyệt                       |
| --------------------------------- | ---------------------------------------------- | --------------------------------- |
| `setup`                           | `tests/auth.setup.js`                          | Chromium                          |
| `api`                             | `tests/api/**`                                 | không                             |
| `chromium` / `firefox` / `webkit` | mọi spec trừ `tests/api/**`, phụ thuộc `setup` | Desktop Chrome / Firefox / Safari |
| `mobile-chrome`                   | như trên                                       | Pixel 7                           |

### Từ fixture tới spec

```
data/ + utils/ ─┐
api/ (ApiClient → AuthApi, AccountApi, RoleApi) ──┐
pages/ (BasePage → AdminLoginPage, AdminLayout, RolePage, components/) ──┤
                                                    ▼
                         fixtures/index.js  (api, apiAs(role), loginPage, adminLayout, rolePage)
                                                    ▼
                      tests/**/*.spec.js  (chỉ mô tả bước + khẳng định, không chứa selector)
```

## 5. Quy ước

- **Tên file**: `tests/<khu-vực>/<slug>.spec.js` cho giao diện, `tests/api/<slug>.api.spec.js` cho API; `<slug>` trùng tên plan `plan/<slug>.md`.
- **Tiêu đề test** bắt đầu bằng ID test case trong plan §9: `test('TC-14 tạo chức vụ mới', { tag: '@smoke' }, …)` để ánh xạ ngược về ma trận truy vết.
- **Tag**: `@smoke` cho luồng chính (chạy trên CI mỗi lần push), `@regression` cho phần còn lại; thêm `@stock` / `@flow` / `@mock` theo mục 9.
- **Import** `test`, `expect` từ `fixtures/index.js`, không import thẳng `@playwright/test`.
- **Selector** nằm trong page object, không nằm trong spec. Ưu tiên `getByRole` / `getByLabel` theo chuỗi hiển thị ở plan §6; dùng `getByTestId` khi không có tên ổn định (quy ước `data-testid` ở `frontend/AGENTS.md`).
- **Đăng nhập giao diện** dùng `test.use({ storageState: storageStateOf('admin') })`; chỉ đi qua form `/login` khi chính luồng đăng nhập là thứ cần kiểm.
- **API**: `const admin = await apiAs('admin')` (token lấy một lần mỗi worker); khẳng định bằng `client.expectOk(res)` (trả `result`) và `client.expectError(res, status, message)` với message nguyên văn §5.4.
- **Dữ liệu test** sinh bằng `uniqueName()` / `uniqueEmail()` (tiền tố `AUTO-` / `auto-`), tạo trước qua API để test độc lập, dọn ở `afterEach` / `finally` để chạy lại nhiều lần không bẩn DB.
- **Đăng nhập sai** chỉ chạy ở `api` + `chromium` (backend khoá tạm tài khoản sau 10 lần sai).
- Không dùng `page.waitForTimeout`; chờ theo trạng thái (`expect(...).toBeVisible()`, `toBeHidden()`).

## 6. CI (GitHub Actions)

`.github/workflows/e2e-smoke.yml` chạy khi push / mở PR vào `main` (và chạy tay bằng `workflow_dispatch`):
dựng MySQL + MinIO bằng `docker-compose.local.yml` → build và chạy backend (jar, profile `local`) → cài phụ thuộc frontend + automation + Chromium → `pnpm test:smoke --project=api --project=chromium` → tải lên `playwright-report/`, `playwright-report-stock/` và `allure-results/` làm artifact (kể cả khi đỏ).

## 7. Luồng xuyên suốt (`tests/e2e-flows/`, lát `kiem-thu-hoi-quy`)

Mỗi luồng là **một test** đi qua nhiều lát như người dùng thật, chia chặng bằng `test.step` (báo cáo HTML / Allure hiện
từng chặng) và chặng cuối luôn kiểm lại **qua API** (đơn đã lưu, tồn kho). Luồng nằm trong
`test.describe('Luồng xuyên suốt @stock @flow')` vì có tạo đơn.

| ID         | Luồng                                                                                                  | Project |
| ---------- | ------------------------------------------------------------------------------------------------------ | ------- |
| TC-01      | F1 khách vãng lai: tìm ở header → lọc size → chi tiết → Add to Bag → giỏ → đăng nhập → COD             | cả 4    |
| TC-02      | F2 khách đã đăng nhập: mega menu → danh mục → "Price: Low-High" → 2 đôi vượt ngưỡng miễn phí giao hàng | desktop |
| TC-03      | F3 khách mới tạo tài khoản ngay lúc thanh toán                                                         | cả 4    |
| TC-04      | F4 mất mạng khi "Place Order" (`context.setOffline`), có mạng lại đặt đúng một đơn                     | desktop |
| TC-05a / b | F5 hết phiên: `create` 401 → refresh → gửi lại; refresh cũng 401 → về `/signin`, giỏ nguyên            | desktop |

Mỗi luồng dùng một sản phẩm và **một size riêng cho từng project** (`flowOf(flow, testInfo)` ở `data/flows.js`), đặt lại
tồn kho bằng `setStockOk(size, 20)` ở đầu test, nên 4 trình duyệt chạy song song không giẫm nhau. Chạy lặp
(`--repeat-each`) thì thêm `--workers=1`: các bản sao của cùng một test dùng chung làn size, chạy song song sẽ đặt lại
tồn kho của nhau. Luồng hết phiên dùng tài khoản mới tạo trong test vì refresh token chỉ dùng được một lần. Cách lát sau nối
thêm bước: `tests/e2e-flows/README.md`.

## 8. Network mocking

Hàm dùng chung ở `utils/network.js` (spec không tự chép lại):

| Kỹ thuật                    | Hàm / API Playwright                                                    | Ví dụ trong bộ test                                     |
| --------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------- |
| Trả lỗi giả                 | `page.route(apiPath('/…'), fail500)` → `route.fulfill({ status: 500 })` | khối "Couldn't load …" ở từng trang                     |
| Lỗi vài lần đầu rồi đi tiếp | `failOnce(status, body, { times })` (đếm `handler.calls`)               | TC-11 lỗi → "Try Again"; TC-05a 401 → refresh → gửi lại |
| Cắt request như mất mạng    | `abortRoute` → `route.abort('failed')`                                  | TC-12 mất ảnh sản phẩm; `dat-hang` lỗi mạng             |
| Trễ rồi cho đi tiếp         | `delayed(ms)` → chờ rồi `route.fallback()`                              | TC-13 mọi `/api/**` trễ 800 ms cả luồng mua             |
| Tắt mạng cả trình duyệt     | `context.setOffline(true / false)`                                      | TC-04                                                   |
| Mạng chậm thật              | CDP `Network.emulateNetworkConditions` (chỉ Chromium)                   | TC-14 skeleton rồi đủ thẻ                               |
| Phát lại HAR                | `page.routeFromHAR(har, { url: ANY_API, notFound: 'abort' })`           | TC-15 `/w` chạy không cần backend                       |
| Đếm request                 | `countRequests(page, pattern, { method })`                              | đúng 1 request `create`, 1 request `refresh`            |

`apiPath('/product/public/list')` dựng RegExp khớp `…/api/product/public/list` có hoặc không có query. HAR ở
`data/har/catalog.har` phải ghi lại khi API danh sách đổi hợp đồng:
`E2E_UPDATE_HAR=1 pnpm exec playwright test tests/network -g TC-15 --project=chromium`.

## 9. Quy tắc tag (`pnpm check:tags`)

| Tag           | Ý nghĩa                                                | Gắn ở                                                |
| ------------- | ------------------------------------------------------ | ---------------------------------------------------- |
| `@smoke`      | đường chính của lát, chạy mỗi lần push                 | mỗi test **đúng một** trong `@smoke` / `@regression` |
| `@regression` | mọi ca còn lại                                         |                                                      |
| `@stock`      | tạo đơn / đổi tồn kho → chạy ở pha 2                   | tiêu đề `test.describe`                              |
| `@flow`       | luồng xuyên suốt `tests/e2e-flows/`                    | tiêu đề `test.describe`                              |
| `@mock`       | test dùng `page.route` / `routeFromHAR` / `setOffline` | `tag` của test                                       |

`scripts/check-tags.mjs` đọc `playwright test --list --reporter=json` của cả hai pha (không chạy test) và **thoát 1**,
in `file:dòng — lý do`, khi: (1) test thiếu hoặc thừa `@smoke` / `@regression`; (2) tiêu đề không bắt đầu bằng
`TC-\d{2}[a-z]?`; (3) trùng ID ở nhiều dòng trong một file (ca data-driven sinh từ cùng một dòng thì được, một TC tách
thành nhiều test thì dùng hậu tố `TC-19b`). **Cảnh báo** (không đổi mã thoát): thao tác tạo đơn nằm ngoài describe
`@stock`; file có quá 3 test `@smoke`. Cuối cùng in bảng thống kê theo file và theo project
(tổng / smoke / regression / stock / flow / mock).
