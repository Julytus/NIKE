---
title: Gỡ toàn bộ phần LUT (kho, gói, tải, bộ sưu tập, gợi ý, dashboard cũ)
slug: go-lut
status: done              # draft → approved → in-progress → done | blocked
dot: plan/thiet-ke-giay.md §6, §9 lát 1.1
module_be: business       # xoá package lut, billing, download, collection, recommend, dashboard; giữ account; thêm payment (payOS)
resource_code: —          # lát này chỉ XOÁ resource LUT, RECOMMEND, DASHBOARD
created: 2026-11-18
approved: 2026-11-18
---

# Gỡ toàn bộ phần LUT

## 1. Mục tiêu và phạm vi

Sau lát này hệ thống chỉ còn **nền dùng chung**: đăng nhập / refresh token, đăng ký khách, `account/me`, phân quyền (module, tài nguyên, chức vụ, phân quyền), MinIO public bucket, client payOS.
Mọi bảng, API, trang, seed, cấu hình của cửa hàng LUT bị xoá hẳn để các lát cửa hàng giày (1.2 → 3.3) bắt đầu từ nền sạch. `/` tạm là trang "Cửa hàng đang được nâng cấp" cho tới lát `giao-dien-nike`.

| Có làm | Không làm (để plan khác) |
|---|---|
| Migration V18 xoá 18 bảng LUT / gói / tải / bộ sưu tập / gợi ý / đánh giá, xoá resource `LUT`, `RECOMMEND`, `DASHBOARD` và module `CATALOG`, `RECOMMENDER`, `SALES` | Bảng giày, ảnh sản phẩm (lát `du-lieu-giay`) |
| Xoá package BE `lut`, `billing` (trừ payOS), `download`, `collection`, `recommend`, `dashboard`, phần sở thích của `account` | Header / footer / trang chủ kiểu Nike (lát `giao-dien-nike`) |
| Chuyển `PayosClient`, `PayosProperties`, `PayosSignature` sang `business.payment.payos`, bỏ phụ thuộc vào gói | Đơn hàng giày, webhook, mock-pay cho đơn giày (lát `dat-hang`) |
| `account/me` bỏ `plan`, `planExpiresAt`, `planAutoRenew`; xoá `account/preference` | Dọn object LUT cũ còn trong MinIO (vô hại, để nguyên) |
| Xoá route / component / store / API client FE của LUT, gói, bộ sưu tập, gợi ý, dashboard; `/` thành trang tạm; menu admin chỉ còn nhóm Hệ thống | |
| Xoá seed `kho-lut` (BE resources, `tools/seed/kho-lut`, `SeedAssetLoader`), `application-eval.yml`, cấu hình `lut:`, `recommend:`, `seed.minio`, private bucket | |

## 2. Tác nhân và phân quyền

| Tác nhân | Sau lát này | Ghi chú |
|---|---|---|
| Khách vãng lai | Xem trang tạm `/`, mở hộp thoại "Đăng nhập" / "Đăng ký" | |
| Khách hàng (`free@nike.local`) | Đăng nhập, menu tài khoản chỉ còn tên / email và "Đăng xuất" | Role "Khách hàng" giữ nguyên |
| Quản trị (`admin@nike.local`) | `/admin`: trang chào + nhóm Hệ thống (Chức vụ, Phân quyền, Tài nguyên, Module) | Không còn mục LUT, Đặc trưng màu, Gợi ý, bảng số liệu |
| Không quyền (`noaccess@nike.local`) | `/admin` chỉ thấy trang chào, menu trống | |

## 3. Luồng nghiệp vụ

**Luồng chính:**
1. Backend khởi động trên DB đang có dữ liệu LUT → Flyway chạy V18 → các bảng LUT biến mất, resource / module LUT biến mất (permission xoá theo `ON DELETE CASCADE`).
2. Backend khởi động trên DB mới → V1 → V17 tạo bảng LUT như cũ, V18 xoá ngay. Không lỗi.
3. Khách vào `/` → thấy trang tạm, đăng ký / đăng nhập bằng hộp thoại cũ (không còn bước 2 "Bạn thích phong cách màu nào?").
4. Quản trị vào `/admin` → trang chào + menu Hệ thống.

**Ngoại lệ:**
- E1. Gọi API LUT cũ (vd `GET /api/lut/public/list`) → 404 "Không tìm thấy" (handler `NoResourceFoundException` đã có).
- E2. Mở route FE cũ (`/luts`, `/pricing`, `/bo-suu-tap`, `/goi-cua-toi`, `/admin/luts`, `/admin/goi-y`, `/admin/dac-trung-mau`) → trang 404 của cửa hàng / admin.

## 4. Cơ sở dữ liệu

Migration `V18__go_lut.sql`. **Không sửa, không xoá V3 → V17 và seed V3_1 / V5_1** (Flyway kiểm checksum; xoá file sẽ làm DB đang chạy báo lỗi validate).

```sql
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS rec_eval_test, rec_eval_run, rec_impression,
  user_event, user_preference, lut_similarity,
  collection_item, collection, download_log,
  subscription, payment_order, `plan`,
  lut_color_feature, lut_tag, lut_category_map, lut, lut_category, creator;
SET FOREIGN_KEY_CHECKS = 1;

DELETE FROM `resource` WHERE `code` IN ('LUT', 'RECOMMEND', 'DASHBOARD');   -- permission xoá theo CASCADE
DELETE FROM `module`   WHERE `code` IN ('CATALOG', 'RECOMMENDER', 'SALES')
  AND NOT EXISTS (SELECT 1 FROM `resource` r WHERE r.module_id = `module`.id);
```

Sau V18 còn đúng các bảng: `module`, `resource`, `role`, `permission`, `user_app`, `refresh_token` (+ `flyway_schema_history`).
Lát sau thêm lại module `CATALOG` / `SALES` và resource `PRODUCT` / `SHOP_ORDER` / `DASHBOARD` bằng mẫu `INSERT ... WHERE NOT EXISTS` như V4.

## 5. Hợp đồng API

Mọi response bọc `{ "code", "message", "result" }`. Prefix `/api`.

### 5.1 Giữ nguyên (không đổi hợp đồng)

`POST /user/authenticate`, `POST /auth/refresh`, `POST /auth/logout`, `GET /user/info`, `POST /user/update-password`, `POST /account/register`,
`/module/*`, `/resource/*`, `/role/*`, `/permission/*`.

### 5.2 `GET /account/me` — đã đăng nhập (đổi: bỏ 3 trường gói)

Response `result`:
```json
{
  "id": 3,
  "isOperator": 0,
  "roleId": 3,
  "roleName": "Khách hàng",
  "name": "Khách Miễn Phí",
  "email": "free@nike.local",
  "hasPassword": 1,
  "active": 1,
  "firstTime": 0
}
```
Không còn các khoá `plan`, `planExpiresAt`, `planAutoRenew` (kể cả giá trị `null`).

### 5.3 Endpoint bị xoá → 404

| Nhóm | Đường dẫn (đại diện, đều phải 404) |
|---|---|
| Kho LUT | `GET /lut/public/list`, `GET /lut/public/get`, `GET /lut/public/related`, `GET /lut/public/suggest`, `GET /lut-category/public/list`, `GET /lut/list`, `POST /lut/update`, `POST /lut/upload`, `POST /lut/publish/{id}`, `GET /lut/feature/list` |
| Gói / thanh toán gói | `GET /plan/public/list`, `POST /order/create`, `GET /order/my-list`, `GET /order/get`, `GET /subscription/my`, `POST /subscription/cancel`, webhook payOS cũ của gói, mock-pay cũ |
| Tải | `POST /lut/download` |
| Bộ sưu tập | `GET /collection/my-list`, `GET /collection/get`, `POST /collection/update`, `POST /collection/item/add` |
| Gợi ý | `GET /recommend/public/for-you`, `GET /recommend/public/profile`, `POST /recommend/dismiss`, `GET /recommend/config`, `GET /recommend/stats`, `GET /recommend/eval/list` |
| Sở thích / dashboard | `GET /account/preference`, `POST /account/preference`, `GET /dashboard/summary` |

### 5.4 Lỗi

| Tình huống | HTTP | Message |
|---|---|---|
| Gọi bất kỳ endpoint ở §5.3 (có hoặc không có token) | 404 | giữ nguyên message hiện có của handler `NoResourceFoundException` (không đổi trong lát này) |
| `GET /account/me` không có token | 401 | "Token không hợp lệ hoặc sai chữ ký" (như cũ) |

## 6. Giao diện (chuỗi cố định)

### 6.1 Trang tạm `/` (thay trang chủ LUT, lát `giao-dien-nike` sẽ thay tiếp)

- `<title>`: "Nike. Just Do It."
- Header tối giản (giữ `ShopShell` + `ShopDialogs`, bỏ sidebar): trái chữ/logo swoosh link về `/`; phải:
  - chưa đăng nhập: nút "Đăng nhập" (mở hộp thoại đăng nhập cũ), nút "Đăng ký" (mở hộp thoại đăng ký cũ);
  - đã đăng nhập: menu tài khoản cũ, **chỉ còn**: nhãn tên + email, "Trang quản trị" (chỉ khi `isOperator = 1` hoặc có quyền VIEW bất kỳ), "Đăng xuất".
- Nội dung căn giữa: tiêu đề `h1` "Cửa hàng đang được nâng cấp", đoạn "Trang bán giày sẽ sớm ra mắt."
- Footer tối giản: "© 2026 Nike, Inc. Bảo lưu mọi quyền. Dự án học tập, không kinh doanh."
- Hộp thoại đăng ký: bấm "Đăng ký" thành công → đóng hộp thoại, đã đăng nhập ngay (không còn bước "Bạn thích phong cách màu nào?").
- Hộp thoại đăng nhập: bỏ các câu mô tả theo ngữ cảnh LUT ("Đăng nhập để tải LUT này." …); mô tả chung: "Đăng nhập để mua sắm và theo dõi đơn hàng."

### 6.2 Admin

- Sidebar: nhóm "Hệ thống" giữ 4 mục "Chức vụ", "Phân quyền", "Tài nguyên", "Module"; xoá "LUT", "Đặc trưng màu", "Gợi ý". Mục "Trang chủ" giữ.
- `/admin`: luôn là trang chào "Xin chào, {tên}" + thẻ "Tài khoản" (đã có), không còn bảng số liệu.

### 6.3 Route bị xoá

`/luts`, `/luts/$slug`, `/luts/danh-muc/$category`, `/bo-suu-tap`, `/bo-suu-tap/$id`, `/goi-cua-toi`, `/pricing`, `/thanh-toan/ket-qua/$code`, `/admin/luts`, `/admin/luts/$id`, `/admin/dac-trung-mau`, `/admin/goi-y`.

## 7. Việc backend (Claude)

Thứ tự:

1. `backend/app/src/main/resources/db/migration/V18__go_lut.sql` đúng nội dung §4.
2. Chuyển payOS: tạo `vn.aeoc.business.payment.payos` chứa `PayosClient`, `PayosProperties`, `PayosSignature` (chép từ `billing/payos`). Bỏ mọi tham chiếu tới `PaymentOrder` / `Plan`: `PayosClient` nhận / trả kiểu riêng trong package `payment.payos` (vd `PayosCreateLinkRequest {orderCode, amount, description, returnUrl, cancelUrl, items}` → `PayosCreateLinkResult {checkoutUrl, paymentLinkId}`). Giữ nguyên thuật toán ký / kiểm chữ ký.
3. Xoá package: `business.lut` (kể cả `seed`, `feature`, `config`), `business.billing`, `business.download`, `business.collection`, `business.recommend` (kể cả `eval`), `business.dashboard`.
4. `business.account`: xoá `PreferenceService`, `UserPreferenceRepository`, `UserSignalChangedEvent`, endpoint `account/preference`; `AccountService.me` bỏ tra gói.
5. `entity`: xoá `data/mysql/{billing,collection,dashboard,download,lut,recommend}`, xoá 3 trường `plan`, `planExpiresAt`, `planAutoRenew` ở `User`. Chạy backend (V18) rồi sinh lại jOOQ (`mvn -pl entity generate-sources`) để `src/main/generated` không còn class của bảng đã xoá; commit phần sinh lại.
6. `base/ErrorCode`: xoá `LUT_FILE_INVALID`, `PREVIEW_MISSING`, `LUT_FILE_MISSING`, `LUT_FEATURE_MISSING`, `PLAN_REQUIRED`, `LUT_FILE_UNAVAILABLE`, `COLLECTION_LIMIT`, `COLLECTION_NAME_EXISTS` và mã khác chỉ LUT dùng.
7. `authenticate/FileStorageService`: xoá private bucket (`minio.private-bucket`, `presignPrivateGet`, upload private) nếu chỉ LUT dùng; giữ upload public.
8. Cấu hình: `application.yml` xoá khối `lut:`, `recommend:`, `seed:` và `minio.private-bucket`; xoá `application-eval.yml`; `backend/.env.example` xoá biến `LUT_*`, `RECOMMEND_*`, `MINIO_PRIVATE_BUCKET` nếu có.
9. Xoá `backend/business/src/main/resources/seed/kho-lut/**` và `tools/seed/kho-lut/**`.
10. `grep -rniE "lut|recommend|subscription|collection_item" backend/*/src tools` chỉ còn kết quả trong `db/migration/V3…V17`, seed `V3_1`, và chữ ngẫu nhiên không liên quan (vd `Collections`).

Unit test bắt buộc: TC-U1, TC-U2 ở §9. `mvn -q -Djooq.codegen.skip=true test` xanh.

## 8. Việc frontend (Claude)

1. Xoá route: các file ở §6.3 (`routes/_shop/luts/**`, `routes/_shop/bo-suu-tap/**`, `routes/_shop/goi-cua-toi.tsx`, `routes/_plain/pricing.tsx`, `routes/_plain/thanh-toan/**`, `routes/admin/luts/**`, `routes/admin/dac-trung-mau.tsx`, `routes/admin/goi-y.tsx`). Nếu `_plain` không còn route con thì xoá luôn `_plain.tsx` và `shop-plain-layout.tsx`.
2. Xoá component: `components/shop/{luts,collection,pricing,subscription,payment,home}/**`, `components/shop/layout/sidebar/**`, `components/admin/{lut,lut-feature,recommend,dashboard}/**`; trong `components/shop/account/` xoá `checkout-panel`, `clear-history-dialog`, `download-done-panel`, `lut-mini-card`, `preference-panel`, `upgrade-panel`.
3. Xoá lib / hook: `lib/axios/{billing,collection,dashboard,lut-admin,lut-feature,luts,recommend,recommend-admin}.ts`, cùng tên trong `lib/tanstack/options/` và `lib/types/` (`lut*`, `collection`, `dashboard`, `recommend`), `lib/mock/**`, `lib/search/**`, `lib/lut-admin/**`, `lib/lut-feature/**`, `lib/recommend/**`, `lib/stores/for-you-dismiss.ts`, `hooks/{use-lut-download,use-save-to-collection,use-viewer-key}.ts`.
4. `lib/stores/shop-dialog.ts`: chỉ còn hai loại hộp thoại `login`, `register`; `shop-dialogs.tsx` bỏ các panel đã xoá, mô tả đăng nhập theo §6.1.
5. `components/shop/layout/`: `ShopLayout` bỏ sidebar; `ShopHeader` / `header-actions` theo §6.1 (bỏ ô tìm kiếm LUT, thẻ gói, các mục menu LUT); `ShopFooter` theo §6.1. `nav-config.ts` xoá.
6. `routes/index.tsx`: trang tạm §6.1 (component mới `components/shop/coming-soon-page.tsx`), dùng `ShopLayout`.
7. `components/admin/sidebar/admin-sidebar.tsx`: theo §6.2. `routes/admin/index.tsx`: bỏ nhánh `DASHBOARD`.
8. `lib/types/account.ts` (và `auth.ts` nếu có): bỏ `plan`, `planExpiresAt`, `planAutoRenew`. Chạy `pnpm api:types` khi backend mới đã chạy để sinh lại `api.gen.ts`.
9. `shop-theme.css`: xoá class chỉ trang LUT dùng (nếu dễ nhận biết; không bắt buộc).
10. `pnpm build && pnpm lint` xanh; `grep -rniE "lut|collection|recommend|subscription|pricing" src` chỉ còn kết quả không liên quan.

Component shadcn dùng: chỉ component có sẵn (`dialog`, `dropdown-menu`, `button`, `card`); không cần `shadcn add`.

## 9. Test case

E2E / API viết bằng JavaScript ở `automation/tests/system/go-lut.spec.js` (khung từ lát `khung-automation`).

| ID | Loại | Mô tả | Tiền điều kiện | Bước | Kết quả mong đợi |
|---|---|---|---|---|---|
| TC-01 | api | API kho LUT công khai đã bị xoá | backend sau V18 | `GET /api/lut/public/list`, `GET /api/lut-category/public/list`, `GET /api/lut/public/suggest?q=a` không token | cả 3 trả HTTP 404 |
| TC-02 | api | API quản trị LUT đã bị xoá | đăng nhập `admin@nike.local` | `GET /api/lut/list`, `POST /api/lut/update` body `{}`, `GET /api/lut/feature/list` | cả 3 trả 404 (không phải 403 / 500) |
| TC-03 | api | API gói / đơn gói đã bị xoá | đăng nhập `free@nike.local` | `GET /api/plan/public/list`, `GET /api/subscription/my`, `GET /api/order/my-list`, `POST /api/order/create` body `{}` | cả 4 trả 404 |
| TC-04 | api | API tải và bộ sưu tập đã bị xoá | đăng nhập `free@` | `POST /api/lut/download` body `{"lutId":1}`, `GET /api/collection/my-list`, `POST /api/collection/item/add` body `{}` | cả 3 trả 404 |
| TC-05 | api | API gợi ý, sở thích, dashboard đã bị xoá | đăng nhập `admin@` | `GET /api/recommend/public/for-you`, `GET /api/recommend/config`, `GET /api/recommend/eval/list`, `GET /api/account/preference`, `GET /api/dashboard/summary` | cả 5 trả 404 |
| TC-06 | api | `account/me` không còn trường gói | đăng nhập `free@` | `GET /api/account/me` | 200; `result.email = "free@nike.local"`, `result.roleName = "Khách hàng"`; `result` **không có** khoá `plan`, `planExpiresAt`, `planAutoRenew` |
| TC-07 | api | `account/me` không token | — | `GET /api/account/me` | 401 |
| TC-08 | api | Đăng ký vẫn chạy | email ngẫu nhiên `auto+<timestamp>@nike.local` | `POST /api/account/register` `{name:"Auto Test", email, plainPassword:"Admin@123"}` → `GET /api/account/me` bằng token trả về | register 200 có `result.token`, `result.refreshToken`; me trả `roleName = "Khách hàng"` |
| TC-09 | api | Đăng nhập / refresh / phân quyền vẫn chạy | — | `POST /api/user/authenticate` admin → `POST /api/auth/refresh` → `GET /api/role/list` | 3 lần đều 200; role list có "Khách hàng" |
| TC-10 | api | Resource LUT / RECOMMEND / DASHBOARD đã biến mất | đăng nhập `admin@` | `GET /api/resource/list` (lấy hết trang) | không có resource code `LUT`, `RECOMMEND`, `DASHBOARD`; vẫn có `MODULE`, `RESOURCE`, `ROLE`, `PERMISSION` |
| TC-11 | api | Module LUT đã biến mất | đăng nhập `admin@` | `GET /api/module/list` | không có code `CATALOG`, `RECOMMENDER`, `SALES`; có `SYSTEM` |
| TC-12 | e2e | Trang tạm `/` cho khách | chưa đăng nhập | mở `/` | title "Nike. Just Do It."; thấy heading "Cửa hàng đang được nâng cấp", đoạn "Trang bán giày sẽ sớm ra mắt.", nút "Đăng nhập", "Đăng ký"; không có chữ "LUT" trên trang |
| TC-13 | e2e | Đăng ký trên trang tạm không còn bước chọn phong cách | chưa đăng nhập | `/` → "Đăng ký" → điền Họ tên "Auto Test", email ngẫu nhiên, mật khẩu "Admin@123" → bấm nút đăng ký | hộp thoại đóng; header hiện tên "Auto Test"; không xuất hiện "Bạn thích phong cách màu nào?" |
| TC-14 | e2e | Menu tài khoản khách chỉ còn mục cơ bản | đăng nhập `free@` qua hộp thoại | mở menu tài khoản | thấy "Khách Miễn Phí", "free@nike.local", "Đăng xuất"; không thấy "Gói của tôi", "Bộ sưu tập", "Sở thích màu", "Xoá lịch sử gợi ý", "Trang quản trị" |
| TC-15 | e2e | Đăng xuất | tiếp TC-14 | bấm "Đăng xuất" | header lại hiện nút "Đăng nhập", "Đăng ký" |
| TC-16 | e2e | Route cửa hàng cũ là 404 | — | lần lượt mở `/luts`, `/pricing`, `/bo-suu-tap`, `/goi-cua-toi` | mỗi trang hiện trang không tìm thấy của cửa hàng (không lỗi trắng trang, không lỗi console `Uncaught`) |
| TC-17 | e2e | Admin: menu chỉ còn Hệ thống, trang chủ không có bảng số liệu | đăng nhập `admin@` qua `/login` | mở `/admin` | thấy "Xin chào, …"; sidebar có "Chức vụ", "Phân quyền", "Tài nguyên", "Module"; **không** có "LUT", "Đặc trưng màu", "Gợi ý"; không có thẻ "Doanh thu" |
| TC-18 | e2e | Route admin cũ là 404 | đăng nhập `admin@` | mở `/admin/luts`, `/admin/goi-y`, `/admin/dac-trung-mau` | hiện trang không tìm thấy |
| TC-19 | e2e | Trang phân quyền vẫn chạy sau khi xoá resource | đăng nhập `admin@` | `/admin/phan-quyen` | bảng ma trận tải được, không có hàng "LUT" / "Gợi ý" / "Bảng số liệu" |
| TC-20 | e2e | `noaccess` vào admin | đăng nhập `noaccess@nike.local` | `/admin` | thấy "Xin chào, …", sidebar không có mục chức năng nào ngoài "Trang chủ" |
| TC-U1 | unit | `PayosSignature` vẫn ký đúng sau khi chuyển package | — | ký dữ liệu mẫu `{amount:2499000, cancelUrl:"http://localhost:4500/huy", description:"DH2611180001", orderCode:1001, returnUrl:"http://localhost:4500/ok"}` với checksum key `test-key` | chữ ký = HMAC-SHA256 hex của chuỗi `amount=2499000&cancelUrl=...&description=...&orderCode=1001&returnUrl=...` (sắp xếp theo khoá); sai 1 ký tự → `verify` trả false |
| TC-U2 | unit | Context Spring khởi động sau khi xoá package | — | test `@SpringBootTest` tối thiểu ở module `app` (profile test, không cần MinIO) hoặc test cấu hình tương đương | context load thành công, không còn bean nào tham chiếu bảng đã xoá |

Kiểm tay khi review (ghi kết quả vào §12): DB local có sẵn dữ liệu LUT → restart → log Flyway "Successfully applied 1 migration … v18"; `SHOW TABLES` còn đúng 6 bảng + `flyway_schema_history`.

## 10. Tiêu chí hoàn thành

- [x] Mọi TC ở §9 pass (20 TC Playwright + 2 unit)
- [x] `mvn test`, `pnpm build`, `pnpm lint` xanh
- [x] grep ở §7 bước 10 và §8 bước 10 sạch
- [x] Có `docs/chuc-nang/go-lut.md`; tài liệu LUT cũ (`docs/chuc-nang/*` của LUT, `docs/tai-lieu-thiet-ke.md`, `plan/thiet-ke-tong-quat.md`, bảng LUT trong `docs/plan/README.md`) chuyển vào `docs/archive/lut/` (Claude làm ở phiên C); README gốc bỏ mô tả LUT

## 11. Rủi ro / câu hỏi mở

1. **Giữ V3 → V17 hay gộp migration?** Plan chọn giữ (an toàn với DB đang chạy). Phương án khác: xoá V3 → V17, đặt `spring.flyway.ignore-migration-patterns: "*:missing"`, DB local phải xoá dựng lại. Không chọn vì rủi ro hơn mà lợi ích chỉ là gọn file.
2. Seed `V5_1` giữ tài khoản `free@nike.local` (role Khách hàng). Lát `du-lieu-giay` thêm `khach1@` / `khach2@`.
3. Object LUT cũ trong MinIO (`luts/…`, bucket `nike-lut`) để nguyên; máy mới sẽ không có vì seed đã xoá.
4. Lát này cook **sau** `khung-automation` (cần thư mục `automation/` để đặt spec). Hai lát cook lần lượt.

## 12. Nhật ký thực hiện (do /cook và /doc-chuc-nang ghi — nối các phiên A/B/C)

| Thời điểm | Sự kiện |
|---|---|
| 2026-11-18 ~19:05 | /cook phiên A bắt đầu. Preflight: MySQL / MinIO healthy, backend :9500 = 200. Branch hiện tại `feature/khung-automation` (PR #1 chưa merge, worktree sạch sau commit 1306c9a); file bẩn có sẵn: chỉ `plan/README.md`, `plan/go-lut.md` (đổi status). |
| 2026-11-18 | Spec nghiệm thu viết trước khi code, **tách 2 file theo quy ước CLAUDE.md** (plan §9 ghi một file `tests/system/go-lut.spec.js`, nhưng project `api` chỉ nhận `tests/api/**`, project UI bỏ qua thư mục đó): `automation/tests/api/go-lut.api.spec.js` (TC-01 → TC-11) và `automation/tests/system/go-lut.spec.js` (TC-12 → TC-20). Thêm `api/ResourceApi.js` (resource + module list), page object `ShopHomePage`, `components/ShopLoginDialog`, `components/ShopRegisterDialog`, `NotFoundPage`, `PermissionPage`, fixture `shopHome` / `notFoundPage` / `permissionPage`; ESLint `expect-expect` nhận thêm `expectAllRemoved`. Trước khi code: API 9 đỏ / 2 xanh (TC-07, TC-09) đúng kỳ vọng. Message 404 thật của handler là "Không tìm thấy API" (spec kiểm nguyên văn). |
| 2026-11-18 | Backend xong theo §7: `V18__go_lut.sql` đúng §4; payOS chuyển sang `business.payment.payos` (`PayosClient.createLink(PayosCreateLinkRequest)` → `PayosCreateLinkResult`, `getStatus`, `cancelLink`, `PayosProperties`, `PayosSignature` giữ nguyên thuật toán); xoá package `lut`, `billing`, `download`, `collection`, `recommend`, `dashboard`, phần sở thích của `account`, entity `data/mysql/{account,billing,collection,dashboard,download,lut,recommend}`, 3 trường gói ở `User`, 11 mã `ErrorCode` chỉ LUT dùng (giữ `PAYMENT_GATEWAY_ERROR`, `INVALID_SIGNATURE`, `ORDER_INVALID_STATUS` cho lát `dat-hang`), private bucket + `readPrivate` / `putPrivate` / `existsPrivate` / `presignPrivateGet` ở `FileStorageService`, khối `lut:` / `collection:` / `recommend:` / `seed:` / `minio.private-bucket` trong yml, `application-eval.yml`, `business/src/main/resources/seed/kho-lut`, `tools/seed/kho-lut`. jOOQ sinh lại còn 6 bảng (36 file xoá). `backend/AGENTS.md` bỏ tham chiếu `LutAdminService` / `putPrivate` / `lut_tag`. Grep §7 bước 10 sạch (chỉ còn V3 → V17, seed V3_1). |
| 2026-11-18 | **Lệch so với code cũ, làm theo §5.2:** `account/me` trước đây chỉ trả `{id, name, email, plan}`; nay trả đúng §5.2 `{id, isOperator, roleId, roleName, name, email, hasPassword, active, firstTime}` (`hasPassword` qua hàm mới `UserService.hasPassword`, vì mật khẩu không nằm trong cache user). Frontend phiên B cần đổi kiểu `lib/types/account.ts` cho khớp. |
| 2026-11-18 | Kiểm: JUnit **4/4** (TC-U1 `PayosSignatureTest` 3 ca, TC-U2 `ApplicationContextTest` — `@SpringBootTest` dùng cấu hình local nên cần MySQL + MinIO Docker). V18 được Flyway áp lúc chạy TC-U2 (19:14:25, `flyway_schema_history` v18 "go lut" success = 1), restart sau đó báo "Schema up to date"; `SHOW TABLES` còn đúng `module, permission, refresh_token, resource, role, user_app` + `flyway_schema_history`. Restart backend OK. `pnpm test:api` **23/23** (11 của lát + 12 của `khung-automation`), `pnpm lint` sạch. **phiên A xong** |
| 2026-11-18 | Lưu ý cho phiên B / C: phiên B làm §8 (frontend), sửa thêm nút "Về Trang Chủ" của `Page404` ở `__root.tsx` (đang trỏ `/luts`). Phiên C: worktree đang ở `feature/khung-automation` — nên merge PR #1 rồi `git switch main && git pull` trước `/doc-chuc-nang go-lut`, để skill tạo `feature/go-lut` từ `main` (không trộn vào PR #1). |
| 2026-11-18 | Phát hiện: `.gitignore` dòng 32 `backend/**/src/test/` bỏ qua mọi unit test backend → `PayosSignatureTest`, `ApplicationContextTest` có trên máy nhưng sẽ **không được commit**. Chưa sửa `.gitignore` (chờ người dùng quyết định). |
| 2026-11-18 ~19:40 | /cook phiên B (ngay sau phiên A, không `/clear`). Frontend theo §8: xoá 12 route §6.3 (cả `_plain.tsx`, và `_shop.tsx` vì không còn route con — `/` dùng thẳng `ShopLayout` có `children`), component `shop/{luts,collection,pricing,subscription,payment,home}`, `shop/layout/sidebar`, `admin/{lut,lut-feature,recommend,dashboard}`, 6 panel tài khoản LUT, lib / hook / type LUT (§8.3) và thêm `lib/stores/shop-ui.ts`, `lib/utils/{plan,colors}.ts`, `shop/ui/{shop-not-found,filter-chip,search-field,brand-icons}.tsx`, `shop-logo.tsx`, `header/{header-search,mobile-nav}.tsx` (không còn chỗ dùng). `shop-dialog` chỉ còn `login` / `register` (mô tả đăng nhập theo §6.1, đăng ký xong đóng hộp thoại); `ShopHeader` (swoosh + `HeaderActions`), menu tài khoản: tên / email, "Trang quản trị" (operator hoặc có VIEW, lỗi lấy quyền thì ẩn), "Đăng xuất"; `ShopFooter` §6.1; `coming-soon-page.tsx`; sidebar admin chỉ còn Trang chủ + Hệ thống; `/admin` luôn là trang chào. `lib/types/account.ts` theo §5.2 mới, `pnpm api:types` sinh lại. `shop-theme.css` bỏ class trang chủ LUT. Grep §8 bước 10 sạch (chỉ còn chữ `go-lut` trong chú thích; ví dụ URI `/lut-category/` ở hộp thoại tài nguyên đổi thành `/product/`). |
| 2026-11-18 | E2E có giao diện lần 1: 6 pass / 5 đỏ — đều lỗi frontend, không sửa spec: (1) TC-12 title vẫn "nike" vì root không render `HeadContent` → thêm `<HeadContent />`, `index.html` title "Nike. Just Do It."; (2) TC-13/14/15 không thấy header: layout gốc bọc mọi trang trong `<main>` nên `header` / `footer` mất landmark `banner` / `contentinfo` (và có `main` lồng `main`) → gốc đổi thành `div#app-scroll` (`scrollToTopSelectors` theo); (3) TC-18 route admin cũ hiện "Not Found" mặc định của router → `NotFoundPage` dùng chung (`components/not-found-page.tsx`, nút "Về Trang Chủ" về `/` thay vì `/luts`), route `/admin` có `notFoundComponent` dạng `embedded`. Lần 2 (headless) 9/9; lần 3 có giao diện `E2E_SLOWMO=400 --headed` chromium **9/9**, 6 ảnh ở `docs/chuc-nang/img/go-lut/`. |
| 2026-11-18 | Kết quả cuối: `pnpm build` xanh, `pnpm lint` 0 lỗi (1 cảnh báo cũ ở `data-table-advanced.tsx`; trước lát là 11). Toàn bộ `pnpm exec playwright test` (6 project): **86 pass + 3 skip / 89** (skip = TC-13 cũ của `khung-automation` chỉ chạy chromium); lát này 11 API + 9 UI × 4 trình duyệt đều xanh. JUnit 4/4 (phiên A). Số vòng sửa: backend 0, frontend 1. Còn để nguyên (ngoài §8, cho lát `giao-dien-nike`): ảnh / video LUT không còn dùng trong `frontend/public/` (`home.mp4`, `hero-wave-*.webp`, `nike.png`, `brand/`), favicon nike. **phiên B xong** |
| 2026-11-18 | /doc-chuc-nang: viết `docs/chuc-nang/go-lut.md` (6 ảnh). Tài liệu LUT cũ chuyển vào `docs/archive/lut/` (`tai-lieu-thiet-ke.md` / `.docx`, `thiet-ke-tong-quat.md`, `ke-hoach-tong.md` từ `docs/plan/README.md`, `huong-dan-su-dung.docx`); README gốc viết lại, bỏ mô tả LUT. Không có `docs/chuc-nang/*` của LUT để chuyển (chưa từng có trên branch này). Branch `feature/go-lut` tách từ `feature/khung-automation` (PR #1 chưa merge); PR mở với base là branch đó, GitHub tự đổi base sang `main` khi PR #1 được merge. `.gitignore` vẫn bỏ qua unit test backend nên 2 file test không vào commit. status → done |
