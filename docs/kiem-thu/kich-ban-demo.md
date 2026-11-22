# Kịch bản demo bảo vệ đồ án

Demo khoảng **15 phút**, 6 phần. Mỗi phần ghi lệnh chạy, điều cần chỉ cho hội đồng và câu nói gợi ý. Lệnh viết cho **Git Bash** trong thư mục `automation/` (PowerShell: thay `E2E_SLOWMO=400 cmd` bằng `$env:E2E_SLOWMO=400; cmd`).

## 0. Chuẩn bị (trước buổi bảo vệ)

**Hôm trước:**

1. Chạy toàn bộ `pnpm test`, rồi `pnpm allure:generate`. Báo cáo này là "kết quả chính thức" mở ra trong phần 5, khỏi chờ chạy lại.
2. Chụp màn hình báo cáo HTML và Allure, dán vào quyển báo cáo + slide (dự phòng khi máy có sự cố).
3. Chạy thử từng lệnh trong tài liệu này một lần.

**30 phút trước khi vào:**

```bash
# ở gốc repo
docker compose -f docker-compose.local.yml --env-file backend/.env up -d
sh scripts/ai/backend-restart.sh "-Djooq.codegen.skip=true"     # chờ "backend sẵn sàng"
cd frontend && pnpm dev                                          # để sẵn một terminal, đỡ chờ Vite lúc demo
```

Máy không có `sh`: thay dòng `backend-restart.sh` bằng `cd backend; mvn -q -DskipTests "-Djooq.codegen.skip=true" package; java -jar app/target/aeoc-backend.jar` trong một cửa sổ PowerShell riêng. Các lệnh demo bên dưới đặt biến theo kiểu `$env:E2E_STOCK=1; $env:E2E_SLOWMO=400; pnpm exec ...`. Chi tiết ở [mục 13 hướng dẫn cài đặt](huong-dan-cai-dat-va-chay.md#13-máy-không-có-sh--git-bash-chạy-hoàn-toàn-bằng-powershell).

Mở sẵn:

- VS Code ở thư mục `automation/`, các tab: `playwright.config.js`, `pages/CartPage.js`, `fixtures/index.js`, `tests/e2e-flows/kiem-thu-hoi-quy.spec.js`, `utils/network.js`.
- Trình duyệt: http://localhost:4500 (cửa hàng), http://localhost:9500/api/swagger-ui.html.
- Terminal ở `automation/`, chữ to (Ctrl + `+`), tắt thông báo Windows.

Chạy làm nóng một lần để Vite biên dịch sẵn (lần đầu chậm):

```bash
pnpm exec playwright test tests/home --project=chromium --grep @smoke --reporter=line
```

## 1. Giới thiệu hệ thống được kiểm thử (2 phút)

- Mở cửa hàng ở :4500: trang chủ → `/w` (danh sách, bộ lọc) → một trang giày → Add to Bag → giỏ.
- Mở Swagger: chỉ 2–3 API sẽ được test (`/product/public/list`, `/cart/public/check`, `/shop-order/create`).

> "Hệ thống được kiểm thử là một web bán giày mô phỏng nike.com: frontend React, backend Spring Boot, MySQL. Đồ án tập trung vào bộ automation test viết bằng JavaScript với Playwright, kiểm cả tầng API lẫn giao diện, trên 4 cấu hình trình duyệt."

## 2. Kiến trúc bộ test (3 phút)

Mở lần lượt các file trong VS Code:

| File | Chỉ vào | Nói |
|---|---|---|
| `playwright.config.js` | mảng `projects`, `webServer`, `globalSetup`, `trace` | "một spec chạy trên Chromium, Firefox, WebKit, Pixel 7; trước khi chạy kiểm backend và reset dữ liệu" |
| `pages/CartPage.js` | constructor chứa locator, `expectSummary` | "Page Object Model: selector nằm ở đây, spec không chứa selector" |
| `fixtures/index.js` | `cartPage`, `apiAs` | "fixture tiêm sẵn page object và API client đã đăng nhập vào test" |
| `tests/e2e-flows/kiem-thu-hoi-quy.spec.js` | TC-01, các `test.step` | "spec chỉ còn bước nghiệp vụ và khẳng định" |

Chạy để hội đồng thấy quy mô:

```bash
pnpm check:tags
```

> "1046 test (tính theo project), mỗi test có ID truy ngược về test case và đúng một tag smoke hoặc regression; script này tự kiểm quy tắc đó."

## 3. Test API (1 phút)

```bash
pnpm test:api
```

Kết quả mong đợi: `130 passed` (pha thường) và `16 passed` (pha stock), khoảng 20 giây.

> "Test API không mở trình duyệt nên rất nhanh, dùng để phủ hợp đồng API và mọi mã lỗi. Hai pha vì test đặt hàng làm đổi tồn kho, phải tách khỏi các test so tồn kho chính xác."

## 4. Test giao diện chạy bằng mắt (5 phút) — phần chính

### 4a. Luồng mua hàng xuyên suốt (TC-01)

```bash
E2E_STOCK=1 E2E_SLOWMO=400 pnpm exec playwright test tests/e2e-flows/kiem-thu-hoi-quy.spec.js -g "TC-01" --project=chromium --headed --workers=1 --reporter=line
```

Trình duyệt tự: tìm "vomero" ở header → lọc size → mở trang chi tiết → chọn size → Add to Bag → giỏ → Checkout → đăng nhập → nhập địa chỉ → Place Order → trang xác nhận có mã đơn `DH…`.

> "Chặng cuối test gọi API kiểm lại: đơn đã lưu đúng, tồn kho đã trừ đúng 1. Một test đi qua 6 chức năng như người dùng thật."

### 4b. Đa trình duyệt (tuỳ thời gian)

```bash
E2E_STOCK=1 pnpm exec playwright test tests/e2e-flows/kiem-thu-hoi-quy.spec.js -g "TC-01" --reporter=line
```

Chạy cùng luồng trên 4 project song song (không mở cửa sổ), khoảng 30 giây, kết quả `8 passed`: 4 bước đăng nhập sẵn của project `setup` + TC-01 trên chromium, firefox, webkit, mobile-chrome.

### 4c. Giả lập điện thoại

```bash
E2E_SLOWMO=400 pnpm exec playwright test tests/product-list/kiem-thu-hoi-quy.spec.js -g "TC-10" --project=mobile-chrome --headed --workers=1 --reporter=line
```

> "Cùng code, project Pixel 7: bộ lọc mở bằng ngăn kéo Filter thay vì sidebar."

## 5. Network mocking (2 phút)

```bash
E2E_SLOWMO=300 pnpm exec playwright test tests/cart/gio-hang.spec.js -g "TC-23" --project=chromium --headed --workers=1 --reporter=line
```

Chỉ vào màn hình: giỏ hiện "Couldn't load your bag." + "Try Again" (API bị chặn trả 500), sau đó bấm Try Again tải được, rồi skeleton khi API chậm.

Mở `utils/network.js`, nói lướt bảng kỹ thuật: lỗi 500, lỗi vài lần đầu, mất mạng (`setOffline`), mạng chậm (CDP), phát lại HAR.

> "Những tình huống này khó tạo bằng tay. Nhóm test này đã tìm ra 2 lỗi thật của frontend: mất mạng lúc đặt hàng và refresh token hết hạn."

Tuỳ chọn, phát lại HAR (trang danh sách chạy với dữ liệu ghi sẵn):

```bash
pnpm exec playwright test tests/network/kiem-thu-hoi-quy.spec.js -g "TC-15" --project=chromium --headed --reporter=line
```

## 6. Báo cáo và gỡ lỗi (2 phút)

```bash
pnpm report             # Playwright HTML của lần chạy gần nhất
pnpm allure:open        # Allure đã sinh từ hôm trước
```

- Trong báo cáo HTML: mở TC-01, chỉ các `test.step`.
- Cho xem **Trace Viewer**: chạy một test với trace rồi mở report, bấm vào trace.

```bash
pnpm exec playwright test tests/cart/gio-hang.spec.js -g "TC-23" --project=chromium --trace on --reporter=line
pnpm report
```

> "Trace ghi lại từng thao tác với ảnh DOM trước và sau, request mạng, console. Khi test đỏ trên CI, tải trace về là xem lại được chuyện gì đã xảy ra."

- Mở `.github/workflows/e2e-smoke.yml` (hoặc tab Actions trên GitHub): "mỗi lần push, CI dựng toàn bộ hệ thống và chạy nhóm smoke".

## Dự phòng khi có sự cố

| Sự cố | Xử lý tại chỗ |
|---|---|
| Backend không lên | mọi lệnh test đều dừng ở global-setup → mở báo cáo HTML / Allure đã chạy sẵn hôm trước và ảnh chụp trong slide |
| Test đỏ ngay lúc demo | biến thành điểm cộng: `pnpm report` → mở trace của test đỏ, chỉ ra bước lỗi |
| Firefox / WebKit chậm, timeout | chạy lại chỉ `--project=chromium`; giải thích Vite dev biên dịch lần đầu |
| Mạng hội trường chặn gì đó | không ảnh hưởng: mọi thứ chạy local (Docker + localhost) |
| Đăng nhập admin bị khoá tạm | khởi động lại backend (`sh scripts/ai/backend-restart.sh`) |

## Câu hỏi hội đồng hay hỏi

| Câu hỏi | Ý trả lời |
|---|---|
| Vì sao chọn Playwright mà không phải Selenium? | auto-wait, chạy cả WebKit, test API cùng bộ, network mocking, trace viewer có sẵn; không cần driver riêng |
| Làm sao test không chập chờn (flaky)? | không `sleep` cố định, chờ theo trạng thái; reset dữ liệu mỗi pha; dữ liệu riêng mỗi test (`uniqueEmail`, làn size theo trình duyệt); tách pha `@stock`; chạy lặp `--repeat-each=3` để kiểm |
| Kết quả mong đợi lấy từ đâu? | từ test case trong plan (§9) và tính từ `products.json` (`data/seed-products.js`), không chép tay con số |
| Test API và test UI khác nhau thế nào, sao cần cả hai? | API: nhanh, phủ mọi mã lỗi và quy tắc nghiệp vụ; UI: kiểm người dùng thấy và làm được; UI dùng API để chuẩn bị dữ liệu và kiểm hậu trạng thái |
| Khi giao diện đổi thì sao? | sửa locator trong page object, spec giữ nguyên; locator ưu tiên vai trò + tên nên ít vỡ khi đổi CSS |
| Đã tìm được lỗi nào chưa? | 2 lỗi frontend ở lát kiểm thử hồi quy (mất mạng lúc đặt hàng, refresh token hết hạn), ghi ở `docs/chuc-nang/kiem-thu-hoi-quy.md` |
| Có tích hợp CI không? | GitHub Actions chạy smoke mỗi lần push / PR, tải báo cáo làm artifact |
