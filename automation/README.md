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

| Lệnh | Việc |
|---|---|
| `pnpm test` | Toàn bộ: project `api` + 4 project giao diện, hai pha (thường rồi `@stock`) |
| `pnpm test:smoke` | Chỉ test gắn tag `@smoke` (luồng chính), mọi project, hai pha |
| `pnpm test:regression` | Chỉ test gắn tag `@regression`, hai pha |
| `pnpm test:api` | Chỉ nhóm API (không bật frontend), hai pha |
| `pnpm test:stock` | Chỉ pha `@stock` (test tạo đơn / đổi tồn kho) |
| `pnpm test:headed` | Chromium có giao diện, 1 worker |
| `pnpm test:ui` | Chế độ UI của Playwright (chọn test, xem từng bước) |
| `pnpm exec playwright test tests/admin/role.spec.js -g "TC-14"` | Chạy một test theo ID |
| `pnpm lint` | ESLint (`eslint-plugin-playwright`) cho code test |

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

| Báo cáo | Lệnh | Vị trí |
|---|---|---|
| Playwright HTML (trace, ảnh, video khi lỗi) | `pnpm report` | `playwright-report/index.html` |
| Playwright HTML của pha `@stock` | `pnpm report:stock` | `playwright-report-stock/index.html` |
| Allure | `pnpm allure:generate` rồi `pnpm allure:open` | `allure-results/` → `allure-report/index.html` |

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
│  └─ role-names.json        giá trị biên tên chức vụ (1 / 50 / 51 ký tự)
├─ utils/                    unique (email / tên duy nhất), format (tiền VNĐ), jwt, doc-shot, env
└─ tests/
   ├─ auth.setup.js          project `setup`: đăng nhập UI admin / noaccess → .auth/<vai-trò>.json
   ├─ api/                   *.api.spec.js — project `api`
   ├─ admin/                 trang quản trị
   ├─ visual/  a11y/  e2e-flows/   (để dành cho các lát sau, xem README trong từng thư mục)
```

### Project

| Project | Chạy gì | Trình duyệt |
|---|---|---|
| `setup` | `tests/auth.setup.js` | Chromium |
| `api` | `tests/api/**` | không |
| `chromium` / `firefox` / `webkit` | mọi spec trừ `tests/api/**`, phụ thuộc `setup` | Desktop Chrome / Firefox / Safari |
| `mobile-chrome` | như trên | Pixel 7 |

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
- **Tag**: `@smoke` cho luồng chính (chạy trên CI mỗi lần push), `@regression` cho phần còn lại.
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
