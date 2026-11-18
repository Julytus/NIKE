---
title: Khung bộ automation test (Playwright + JavaScript)
slug: khung-automation
status: done       # draft → approved → in-progress → done | blocked
dot: plan/thiet-ke-giay.md §8, §9 lát 0.1
module_be: —              # không đổi backend
resource_code: —
created: 2026-11-18
approved: 2026-11-18
---

# Khung bộ automation test

## 1. Mục tiêu và phạm vi

Dựng project `automation/` (JavaScript ESM, Playwright) làm nền cho toàn bộ đồ án: cấu trúc Page Object Model, fixture, dữ liệu kiểm thử, API client, chạy đa trình duyệt, báo cáo HTML + Allure, ESLint, CI GitHub Actions chạy nhóm `@smoke`.
Bộ test đầu tiên phủ những phần **không đổi** trong suốt dự án: API xác thực / đăng ký và trang quản trị Chức vụ (đăng nhập `/login`, CRUD, phân quyền). Từ lát sau, spec nghiệm thu của mỗi lát viết thẳng vào `automation/`.

| Có làm | Không làm (để lát khác) |
|---|---|
| `automation/` đủ cấu trúc §8.1 thiết kế tổng (thư mục `visual/`, `a11y/`, `e2e-flows/` tạo sẵn kèm README ngắn) | Test cửa hàng (chưa có), visual / a11y thật (lát 4.2) |
| `playwright.config.js`: project `setup`, `api`, `chromium`, `firefox`, `webkit`, `mobile-chrome` | Chạy regression mỗi đêm, Allure có lịch sử trên CI (lát 4.3) |
| Fixture: `api`, `apiAs(role)`, page object, đăng nhập sẵn theo vai trò bằng `storageState` | Endpoint `test-support/reset` (lát `du-lieu-giay`) |
| Page object: `AdminLoginPage`, `AdminLayout` (sidebar), `RolePage`, `RoleDialog`, `DeleteConfirmDialog` | |
| API client: `AuthApi`, `AccountApi`, `RoleApi` | |
| Báo cáo: Playwright HTML + `allure-playwright`; script `allure:generate`, `allure:open` | |
| ESLint (`eslint-plugin-playwright`) + Prettier cho code test | |
| GitHub Actions `.github/workflows/e2e-smoke.yml` (push / PR vào `main`) | |
| Cập nhật `CLAUDE.md`, `AGENTS.md`, `frontend/AGENTS.md`, skill `cook` / `plan-feature` / `doc-chuc-nang` sang `automation/` + JS; quy ước `data-testid` | |

## 2. Tác nhân và phân quyền

| Tác nhân | Dùng trong test | Ghi chú |
|---|---|---|
| Quản trị toàn quyền | `admin@downbeat.local` / `Admin@123` | storageState `automation/.auth/admin.json` |
| Không quyền | `noaccess@downbeat.local` / `Admin@123` | storageState `automation/.auth/noaccess.json` |
| Khách hàng | `free@downbeat.local` / `Admin@123` (đổi sang `khach1@` khi lát `du-lieu-giay` xong) | chỉ dùng qua API trong lát này |

## 3. Luồng

**Chạy tại máy:** MySQL + MinIO (docker) → backend `:9500` → `cd automation && pnpm test` (Playwright tự bật frontend `:4500` nếu chưa chạy) → `pnpm report` / `pnpm allure:open`.
**Chạy trên CI:** dựng MySQL + MinIO bằng `docker-compose.local.yml` → build + chạy backend (jar, profile `local`) → `pnpm install` frontend → `automation`: cài trình duyệt, chạy `--grep @smoke --project=api --project=chromium` → tải lên `playwright-report/` và `allure-results/` làm artifact.

**Ngoại lệ:**
- E1. Backend chưa chạy → `global-setup.js` dừng ngay với thông báo "Backend chưa chạy ở http://localhost:9500 — chạy: sh scripts/ai/backend-restart.sh" (không để hàng loạt test đỏ khó hiểu).
- E2. Test sinh dữ liệu (chức vụ) → tên có tiền tố `AUTO-` + thời gian; `afterAll` xoá qua API để chạy lại nhiều lần không bẩn DB.

## 4. Cơ sở dữ liệu

Không đổi.

## 5. Hợp đồng API được kiểm (đã có, không đổi)

| Endpoint | Body / tham số | Kết quả mong đợi |
|---|---|---|
| `POST /api/user/authenticate` | `{ "email": "admin@downbeat.local", "plainPassword": "Admin@123" }` | 200, `result.token`, `result.refreshToken`, `result.userId` |
| `POST /api/auth/refresh` | `{ "refreshToken": "<từ đăng nhập>" }` | 200, `result.token` mới |
| `POST /api/auth/logout` | token | 200; refresh token cũ dùng lại → 401 |
| `POST /api/account/register` | `{ "name", "email", "plainPassword" }` | 200, `result.token` |
| `GET /api/account/me` | token | 200, `result.id`, `result.name`, `result.email`, `result.plan` (không có `roleName` — chức vụ đối chiếu qua `roleId` trong JWT; sửa 18/11 — §12) |
| `GET /api/role/list`, `GET /api/role/get?id=`, `POST /api/role/update`, `POST /api/role/delete/{id}` | | như code hiện có |

### 5.4 Lỗi được kiểm

| Tình huống | HTTP | Message |
|---|---|---|
| Sai mật khẩu | 400 | "Tài khoản hoặc mật khẩu không đúng." |
| Đăng ký email đã có | 400 | "Email đã được đăng ký" |
| Đăng ký mật khẩu 7 ký tự | 400 | "Mật khẩu phải có từ 8 đến 72 ký tự" |
| Đăng ký email sai định dạng | 400 | "Email không hợp lệ" |
| Đăng ký thiếu họ tên | 400 | "Vui lòng nhập họ tên" |
| Refresh token sai | 401 | "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại" |
| Không token gọi `account/me` | 401 | (message hiện có) |
| `noaccess` gọi `role/list` | 403 | "Bạn không có quyền thực hiện thao tác này! Path: /role/, Action: VIEW" (do `BaseController.checkPermission` ghi đè message của `FORBIDDEN`; sửa 18/11 — §12) |
| `role/get` id không tồn tại (999999) | 404 | "Dữ liệu không tồn tại" |

## 6. Giao diện được kiểm (chuỗi lấy từ UI hiện có)

- `/login`: label "Email hoặc số điện thoại*", "Mật khẩu*", checkbox "Ghi nhớ đăng nhập", nút "Đăng nhập".
- `/admin/chuc-vu`: tiêu đề "Chức vụ", ô tìm "Tìm theo tên chức vụ...", nút "Thêm chức vụ"; dialog "Tạo mới chức vụ" / "Chỉnh sửa chức vụ", nút "Tạo mới" / "Cập nhật"; lỗi "Vui lòng nhập tên chức vụ", "Tên chức vụ tối đa 50 ký tự"; xoá: nút "Xóa", toast "Xóa chức vụ thành công"; toast tạo / sửa: "Tạo chức vụ thành công" / "Cập nhật chức vụ thành công" (lấy từ `lib/tanstack/options/role.ts`, 18/11).
- Khi viết spec, Claude đọc component thật để lấy nguyên văn các chuỗi còn lại (toast tạo / sửa).

## 7. Việc backend (Claude)

Không có.

## 8. Việc frontend (Claude)

Không có. (Quy ước `data-testid` ghi vào `frontend/AGENTS.md` để áp dụng từ lát `giao-dien-nike`; lát này **không** sửa `frontend/src`.)

## 8b. Việc của Claude (lát này Claude tự làm toàn bộ — đây là code test)

1. `automation/package.json` (`"type": "module"`, Node ≥ 20): `@playwright/test@1.63.0` (khớp frontend), `allure-playwright`, `allure-commandline`, `dotenv`, `@faker-js/faker`, `eslint`, `eslint-plugin-playwright`, `prettier`. Scripts: `test`, `test:smoke` (`--grep @smoke`), `test:api` (`--project=api`), `test:ui` (`--ui`), `test:headed`, `report`, `allure:generate`, `allure:open`, `lint`.
2. `automation/playwright.config.js`: `baseURL` = `BASE_URL` (mặc định `http://localhost:4500`), `API_URL` (mặc định `http://localhost:9500/api`); `fullyParallel`, `retries` 2 trên CI, `trace: retain-on-failure`, `screenshot: only-on-failure`, `video: retain-on-failure`, `slowMo` từ `E2E_SLOWMO`; reporter `list` + `html` + `allure-playwright`; `globalSetup`; `webServer` bật `pnpm --dir ../frontend dev` khi chưa chạy (`reuseExistingServer`).
   Projects: `setup` (tạo storageState) → `api` (testMatch `tests/api/**`, không trình duyệt) · `chromium` · `firefox` · `webkit` · `mobile-chrome` (Pixel 7) — 4 project UI `dependencies: ['setup']`, `testIgnore: tests/api/**`.
3. `automation/.env.example`, `.gitignore` (`.auth/`, `test-results/`, `playwright-report/`, `allure-*`, `.env`).
4. `automation/global-setup.js`: kiểm `GET {API_URL}/v3/api-docs` = 200, sai thì dừng với thông báo E1.
5. `automation/tests/auth.setup.js`: đăng nhập UI `/login` cho `admin`, `noaccess` → lưu `.auth/<role>.json`.
6. `automation/fixtures/index.js`: `test = base.extend({ api, apiAs, loginPage, adminLayout, rolePage, ... })`; `apiAs('admin' | 'noaccess' | 'customer')` trả API client đã gắn token (đăng nhập bằng API, cache theo worker). Xuất `expect`.
7. `automation/api/`: `ApiClient` (bọc `request`, tự thêm `Authorization`, hàm `expectOk`, `expectError(status, message)`), `AuthApi`, `AccountApi`, `RoleApi`.
8. `automation/pages/`: `BasePage` (`goto`, chờ tải), `AdminLoginPage`, `AdminLayout` (sidebar: `menuItem(name)`), `RolePage` (`search`, `openCreate`, `row(name)`, `edit(name)`, `delete(name)`), `components/RoleDialog`, `components/DeleteConfirmDialog`. Selector ưu tiên `getByRole` / `getByLabel` theo chuỗi §6.
9. `automation/data/`: `accounts.js` (đọc từ env, mặc định tài khoản local), `register-invalid.json` (bảng dữ liệu cho TC-06 → TC-09), `role-names.json` (dữ liệu biên tên chức vụ: 1, 50, 51 ký tự).
10. `automation/utils/`: `unique.js` (`uniqueEmail()`, `uniqueName(prefix)`), `format.js` (`formatVnd` dùng cho lát sau).
11. Spec: `tests/api/auth.api.spec.js`, `tests/api/role.api.spec.js`, `tests/admin/admin-login.spec.js`, `tests/admin/role.spec.js` (§9). Tag `@smoke` cho TC-01, TC-03, TC-12, TC-14; còn lại `@regression`.
12. `automation/README.md`: cài đặt, chạy, cấu trúc thư mục, quy ước (tên file, tag, page object, dữ liệu test), cách xem báo cáo. Viết để chép vào quyển được.
13. `.github/workflows/e2e-smoke.yml`: trigger push / PR vào `main` + `workflow_dispatch`; job ubuntu: Java 21, Node 22, pnpm; tạo `backend/.env` từ `.env.example`; `docker compose -f docker-compose.local.yml --env-file backend/.env up -d`; `mvn -q -Djooq.codegen.skip=true -pl app -am package -DskipTests`; chạy jar nền với `SPRING_PROFILES_ACTIVE=local`, chờ `/api/v3/api-docs`; `pnpm install` ở `frontend` và `automation`; `npx playwright install --with-deps chromium`; `pnpm test:smoke --project=api --project=chromium`; upload artifact `playwright-report`, `allure-results` (luôn chạy kể cả khi đỏ).
14. (CLAUDE.md và skill `cook` / `plan-feature` / `doc-chuc-nang` đã chuyển sang mô hình Claude làm toàn bộ ngày 18/11/2026; còn lại khi cook: rà `AGENTS.md`, `frontend/AGENTS.md`, thêm lệnh test cuối cùng vào CLAUDE.md.) Cập nhật tài liệu hướng dẫn: `CLAUDE.md` (mô tả dự án mới: cửa hàng giày Nike + đề tài automation test; vai trò Claude sửa `automation/**`, `.github/workflows/**`; bỏ `frontend/tests/e2e`; lệnh chạy test mới), `AGENTS.md`, `frontend/AGENTS.md` (quy ước `data-testid` §8.4 thiết kế tổng), `.claude/skills/{cook,plan-feature,doc-chuc-nang}/SKILL.md` (đường dẫn spec `automation/tests/<khu-vực>/<slug>.spec.js`, chạy `cd automation && pnpm test …`, bỏ chữ "AEOC").
15. Xoá cấu hình Playwright cũ ở `frontend/` (`playwright.config.ts`, script `test:e2e*`, devDependency `@playwright/test`, `@axe-core/playwright` chuyển sang `automation/`) — Claude làm (người dùng giao toàn bộ cho Claude, 18/11/2026).

## 9. Test case

| ID | Loại | Mô tả | Tiền điều kiện | Bước | Kết quả mong đợi |
|---|---|---|---|---|---|
| TC-01 | api | Đăng nhập đúng `@smoke` | — | `AuthApi.login(admin)` | 200; có `token`, `refreshToken`, `userId` > 0 |
| TC-02 | api | Đăng nhập sai mật khẩu | — | login `admin@` / `Sai@12345` | 400 "Tài khoản hoặc mật khẩu không đúng." |
| TC-03 | api | Refresh và logout `@smoke` | đăng nhập admin | refresh → token mới khác cũ; logout; refresh lại bằng refreshToken cũ | refresh 200; logout 200; refresh sau logout 401 "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại" |
| TC-04 | api | Refresh token rác | — | refresh `"abc"` | 401 cùng message trên |
| TC-05 | api | Đăng ký thành công rồi `me` | email `uniqueEmail()` | register → `me` bằng token trả về | register 200; me `email`, `name` khớp; `roleId` trong token = id chức vụ "Khách hàng" |
| TC-06 → TC-09 | api | Đăng ký dữ liệu sai (data-driven từ `register-invalid.json`) | — | 4 dòng: email trùng `admin@downbeat.local`; mật khẩu `Abc@123` (7 ký tự); email `khong-hop-le`; họ tên rỗng | lần lượt 400 "Email đã được đăng ký" / "Mật khẩu phải có từ 8 đến 72 ký tự" / "Email không hợp lệ" / "Vui lòng nhập họ tên" |
| TC-10 | api | `me` không token | — | `GET /account/me` | 401 |
| TC-11 | api | Quyền chức vụ | — | `apiAs('noaccess').role.list()`; `apiAs('admin').role.get(999999)` | 403 "Bạn không có quyền thực hiện thao tác này! Path: /role/, Action: VIEW"; 404 "Dữ liệu không tồn tại" |
| TC-12 | e2e | Đăng nhập trang quản trị `@smoke` | chưa đăng nhập | `/login` → nhập admin → "Đăng nhập" | vào `/admin`, thấy "Xin chào"; sidebar có "Chức vụ" |
| TC-13 | e2e | Đăng nhập sai trên UI | — | `/login` → admin + `Sai@12345` | ở lại `/login`, hiện "Tài khoản hoặc mật khẩu không đúng." |
| TC-14 | e2e | Tạo chức vụ `@smoke` | storageState admin | `/admin/chuc-vu` → "Thêm chức vụ" → tên `AUTO-<time>` → "Tạo mới" | dialog đóng; tìm theo tên thấy đúng 1 dòng |
| TC-15 | e2e | Sửa chức vụ | có chức vụ `AUTO-…` (tạo qua API) | bấm "Chỉnh sửa" dòng đó → đổi tên `AUTO-…-sua` → "Cập nhật" | bảng hiện tên mới, tên cũ không còn |
| TC-16 | e2e | Xoá chức vụ | có chức vụ `AUTO-…` (tạo qua API) | xoá dòng → xác nhận "Xóa" | toast "Xóa chức vụ thành công"; tìm không còn dòng |
| TC-17 | e2e | Validate tên chức vụ (giá trị biên) | storageState admin | mở "Thêm chức vụ": để trống → "Tạo mới"; nhập 51 ký tự → "Tạo mới"; nhập 50 ký tự → "Tạo mới" | "Vui lòng nhập tên chức vụ"; "Tên chức vụ tối đa 50 ký tự"; 50 ký tự tạo được |
| TC-18 | e2e | `noaccess` không thấy Chức vụ | storageState noaccess | mở `/admin` rồi `/admin/chuc-vu` | sidebar không có "Chức vụ"; trang chức vụ báo không có quyền (chuỗi hiện có của `admin-access-denied`) |
| TC-19 | e2e | Chạy đa trình duyệt | — | `pnpm test --grep @smoke` (đủ 4 project UI) | TC-12, TC-14 pass trên chromium, firefox, webkit, mobile-chrome |
| TC-20 | khung | Báo cáo + CI | — | chạy `pnpm test:smoke`, `pnpm allure:generate`; push nhánh, mở workflow | có `playwright-report/index.html`, `allure-report/index.html`; workflow "E2E smoke" xanh, có artifact |
| TC-21 | khung | Backend tắt | backend dừng | `pnpm test:api` | dừng ngay ở global setup với thông báo E1, không chạy test nào |

## 10. Tiêu chí hoàn thành

- [x] Mọi TC ở §9 pass (TC-19 có thể bỏ webkit nếu Windows thiếu thư viện — ghi lý do ở §12)
- [x] `pnpm lint` ở `automation/` xanh
- [ ] Workflow CI xanh trên nhánh feature (chờ chạy thật sau khi push — xem PR)
- [x] Có `docs/chuc-nang/khung-automation.md` (chương "Kiến trúc bộ kiểm thử" của quyển: sơ đồ thư mục, sơ đồ fixture → page object → spec, ảnh báo cáo HTML / Allure / CI)

## 11. Rủi ro / câu hỏi mở

1. `LOGIN_TOO_MANY_ATTEMPTS` (429): test đăng nhập sai chạy song song nhiều trình duyệt có thể bị khoá tạm. Cách xử lý: test sai mật khẩu chỉ chạy ở project `chromium` + `api`, và dùng tài khoản riêng nếu cần.
2. CI cần MinIO + MySQL trong Docker trên runner GitHub (đủ dùng với gói miễn phí). Nếu backend khởi động chậm, tăng thời gian chờ tới 180 giây.
3. (Đã giải quyết) Mục 15 do Claude làm luôn.
4. `free@downbeat.local` là tài khoản khách tạm; đổi sang `khach1@` khi lát `du-lieu-giay` xong.

## 12. Nhật ký thực hiện (do /cook và /doc-chuc-nang ghi — nối các phiên A/B/C)

| Thời điểm | Sự kiện |
|---|---|
| 2026-11-18 ~18:00 | /cook bắt đầu (gộp phiên A + B vì lát chỉ có code test). Preflight: MySQL / MinIO healthy, backend :9500 = 200, frontend :4500 chưa chạy (Playwright tự bật). File bẩn có sẵn: `.env.example`, `CLAUDE.md`, `README.md`, `backend/.env.example`, `application.yml`, jOOQ generated, `docker-compose*.yml`, xoá `docs/chuc-nang/**` + `docs/img/readme/**`, `frontend/{.env.example,AGENTS.md,playwright.config.ts,vite.config.ts,routeTree.gen.ts}`, 3 file `components/shop/**`, `plan/*.md`, `scripts/ai/chup-anh-readme.mjs`; chưa track: `docs/huong-dan-su-dung.docx`, `frontend-dev.log`, `plan/{go-lut,khung-automation,thiet-ke-giay}.md`, `plan/ui-nike/`. |
| 2026-11-18 | Dựng `automation/` theo §8b mục 1–13: package (Playwright 1.63.0, allure-playwright 3.15, ESLint 9 + eslint-plugin-playwright, Prettier, faker, dotenv), config 6 project, `global-setup.js`, `auth.setup.js`, fixture `api` / `apiAs` (token cache theo worker) / page object, API client, page object, data, utils (`unique`, `format`, `jwt`, `doc-shot`, `env`), 4 spec, README, `.github/workflows/e2e-smoke.yml`. Mục 15: xoá `frontend/playwright.config.ts`, script `test:e2e*`, devDependency `@playwright/test` + `@axe-core/playwright` (chuyển sang `automation/`), `pnpm install` lại frontend (trước đó `frontend/node_modules` thiếu `vite`). Mục 14: viết lại `AGENTS.md` (bỏ mô hình worker Orca), `frontend/CLAUDE.md`, sửa `frontend/AGENTS.md` (bỏ `tests/e2e`, thêm mục "Quy ước để dễ kiểm thử tự động" = §8.4 thiết kế tổng), `README.md` gốc, `CLAUDE.md` (lệnh `test:api`, mô tả `automation/`); skill `cook` / `plan-feature` / `doc-chuc-nang` đã đúng sẵn, không sửa. |
| 2026-11-18 | **Sửa plan theo API / UI thật (lát này không đổi backend / frontend):** (1) §5.4 403 của `role/list` là "Bạn không có quyền thực hiện thao tác này! Path: /role/, Action: VIEW" — `BaseController.checkPermission` ghi đè message của `ErrorCode.FORBIDDEN` ("Không có quyền truy cập"). (2) §5 `account/me` không trả `roleName` → TC-05 đối chiếu `roleId` trong JWT (claim `user`) với id chức vụ "Khách hàng" lấy qua `role/list`. (3) §6 toast xoá là "Xóa chức vụ thành công" (không phải "Xóa thành công"); thêm toast tạo / sửa "Tạo chức vụ thành công" / "Cập nhật chức vụ thành công". (4) TC-03: refresh token dùng một lần (đổi mới mỗi lần refresh) nên kiểm `refreshToken` mới ≠ cũ + token mới gọi `me` được, rồi logout bằng refresh token mới → refresh lại 401; không so access token vì JWT cấp trong cùng một giây có thể trùng nhau. |
| 2026-11-18 | Ngoài §9 (bổ sung): TC-11b vòng đời chức vụ qua API (tạo → get → list → sửa → xoá → get 404) để phủ đủ 4 endpoint role §5; TC-17 thêm ca tên chỉ có khoảng trắng. TC-13 chỉ chạy `chromium` (§11.1) → 3 skip ở firefox / webkit / mobile-chrome. Nút "Thêm chức vụ" ở màn hẹp chỉ còn icon (chữ `hidden lg:inline`, không `aria-label`) → `RolePage.addButton` dự phòng `button:has(svg.lucide-plus)`; sẽ thay bằng `data-testid` / `aria-label` ở lát `giao-dien-nike`. |
| 2026-11-18 | Kết quả: `pnpm test:api` 12/12 (TC-01 → TC-11b). TC-21: `API_URL=http://localhost:9599/api pnpm test:api` dừng ở global setup sau 0,5 s với thông báo E1, 0 test chạy. Chromium headless 9/9; firefox + webkit + mobile-chrome 20 pass + 3 skip (webkit chạy được trên Windows). Toàn bộ `pnpm exec playwright test`: lần 1 TC-12 firefox đỏ vì chờ ô đăng nhập quá 7 s khi 42 test song song và Vite dev biên dịch lần đầu (ảnh lỗi cho thấy trang đã hiện đủ) → tăng `expect.timeout` 10 s, `goto` chờ `load`; lần 2 **39 pass + 3 skip / 42**. `pnpm test:smoke` 12/12 (TC-19: TC-12, TC-14 pass trên 4 project UI). Có giao diện `E2E_SLOWMO=400 --headed` chromium 9/9, 9 ảnh ở `docs/chuc-nang/img/khung-automation/`. `pnpm lint` 0 lỗi 0 cảnh báo, Prettier sạch; `pnpm allure:generate` ra `allure-report/index.html`, có `playwright-report/index.html`. Frontend sau khi gỡ Playwright: `pnpm build` xanh, `pnpm lint` 0 error (11 warning cũ). |
| 2026-11-18 | Còn lại cho phiên C: TC-20 phần CI (push nhánh `feature/khung-automation`, xem workflow "E2E smoke" xanh + artifact) — workflow chưa chạy thật lần nào; nếu đỏ thì sửa `.github/workflows/e2e-smoke.yml`. Lưu ý `pnpm test --reporter=…` bị pnpm 12 hiểu là cờ của pnpm → dùng `pnpm exec playwright test …` (đã ghi README). Chức vụ `AUTO-probe-1` (id 4) tạo lúc dò API còn trong DB local (lệnh xoá bị chặn) — xoá tay ở `/admin/chuc-vu` nếu muốn. Người dùng tạo commit `211b3c8 first commit` lúc 18:48 (lịch sử chỉ còn 1 commit, đã gồm một phần `automation/` lúc đang làm) → `git status` chỉ hiện phần sửa sau mốc đó. **phiên A xong · phiên B xong** |
| 2026-11-18 | /doc-chuc-nang: viết `docs/chuc-nang/khung-automation.md` (9 ảnh) + `docs/chuc-nang/README.md`, plan → done, push `feature/khung-automation` + mở PR. Mục §10 workflow CI còn chờ chạy thật trên GitHub. |
