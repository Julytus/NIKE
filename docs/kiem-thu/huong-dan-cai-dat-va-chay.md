# Hướng dẫn cài đặt và chạy bộ automation test

Tài liệu này đi từ máy trống tới lúc chạy xong bộ test và mở được báo cáo. Viết cho **Windows 10/11**; lệnh trong khối `bash` chạy ở **Git Bash**, khối `powershell` chạy ở **PowerShell**. Mọi lệnh chạy từ **thư mục gốc repo** trừ khi ghi rõ `cd automation`.

> Máy không có `sh` / Git Bash: mọi bước vẫn làm được bằng PowerShell, xem [mục 13](#13-máy-không-có-sh--git-bash-chạy-hoàn-toàn-bằng-powershell).

Hệ thống gồm 3 phần chạy cùng lúc trên máy:

```
Trình duyệt (Playwright điều khiển)
        │
        ▼
Frontend React (Vite)  http://localhost:4500     ← Playwright tự bật nếu chưa chạy
        │  gọi REST
        ▼
Backend Spring Boot    http://localhost:9500/api ← phải bật trước khi chạy test
        │
        ▼
MySQL :3326  +  MinIO :9020 (ảnh giày)            ← chạy trong Docker
```

## 1. Cài phần mềm

| Phần mềm | Phiên bản | Dùng để | Kiểm tra |
|---|---|---|---|
| Git (kèm Git Bash) | mới nhất | lấy code, chạy script `.sh` | `git --version` |
| Docker Desktop | mới nhất | chạy MySQL + MinIO | `docker --version` |
| JDK | **21** | build và chạy backend, sinh báo cáo Allure | `java -version` |
| Maven | 3.9+ | build backend | `mvn -v` |
| Node.js | **20 trở lên** (máy làm đồ án dùng 24) | chạy frontend và Playwright | `node -v` |
| pnpm | 12.x | quản lý gói JS | `pnpm -v` |

Cài pnpm sau khi có Node:

```bash
npm install -g pnpm
```

Mở Docker Desktop và chờ biểu tượng chuyển sang trạng thái "running" trước khi làm bước 3.

## 2. Lấy mã nguồn và tạo file môi trường

```bash
git clone <địa-chỉ-repo> NikeShoes
cd NikeShoes
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp automation/.env.example automation/.env     # tuỳ chọn, mặc định đã chạy được
```

Giá trị mặc định trong các file mẫu đủ để chạy local, không cần sửa. Riêng `backend/.env` không được bọc giá trị trong dấu `"..."`.

## 3. Bật hạ tầng (MySQL + MinIO)

```bash
docker compose -f docker-compose.local.yml --env-file backend/.env up -d
docker ps --filter name=nike-      # phải thấy nike-mysql (healthy) và nike-minio
```

Muốn xem DB bằng phpMyAdmin (http://localhost:8092) thì thêm `--profile tools` vào lệnh `up`.

## 4. Chạy backend (:9500)

Lần đầu DB còn trống: Flyway tạo bảng + tài khoản mẫu, `ShoeSeedRunner` nạp 31 đôi giày từ `products.json` và đẩy ảnh lên MinIO. Việc này mất khoảng 1 phút.

**Cách 1, Git Bash (khuyên dùng):** script build, dừng bản cũ nếu có, chạy nền và chờ tới khi API trả 200.

```bash
sh scripts/ai/backend-restart.sh "-Djooq.codegen.skip=true"
# kết quả mong đợi: "backend sẵn sàng (http://localhost:9500/api/v3/api-docs 200, ...)"
```

**Cách 2, chạy tay** (giữ cửa sổ terminal mở):

```bash
cd backend
mvn -q -DskipTests "-Djooq.codegen.skip=true" package
java -jar app/target/aeoc-backend.jar
```

Kiểm tra: mở http://localhost:9500/api/swagger-ui.html thấy trang Swagger là được.

> `-Djooq.codegen.skip=true` bắt buộc ở lần build đầu: jOOQ codegen đọc DB lúc build, DB trống thì sinh ra schema rỗng và build lỗi. Lớp sinh sẵn đã có trong `backend/entity/`.

## 5. Cài frontend (:4500)

```bash
cd frontend
pnpm install
pnpm dev          # tuỳ chọn: chạy tay để tự xem web; khi chạy test, Playwright tự bật nếu chưa có
```

Mở http://localhost:4500 thấy trang chủ cửa hàng là được.

## 6. Cài bộ automation test

```bash
cd automation
pnpm install
pnpm exec playwright install      # tải Chromium, Firefox, WebKit (~500 MB, chỉ làm một lần)
```

Kiểm tra nhanh, không cần chạy test: lệnh dưới liệt kê toàn bộ test, kiểm tag và in bảng thống kê.

```bash
pnpm check:tags
# dòng cuối: "check-tags: 1046 test, 0 lỗi, 0 cảnh báo"
```

## 7. Chạy test

Mọi lệnh dưới đây chạy trong `automation/`. Backend phải đang chạy; nếu không, `global-setup.js` dừng ngay với thông báo `Backend chưa chạy ở http://localhost:9500 — chạy: sh scripts/ai/backend-restart.sh`.

Trước mỗi lần chạy, `global-setup.js` gọi `POST /test-support/reset` để đưa dữ liệu cửa hàng về đúng `products.json`, nên chạy lại nhiều lần vẫn cho cùng kết quả.

### 7.1 Các lệnh chính

| Lệnh | Chạy gì | Thời gian đo ngày 20/11/2026 |
|---|---|---|
| `pnpm test:api` | 146 test API, không mở trình duyệt | ~20 giây (130 + 16 pass) |
| `pnpm test:smoke` | 118 test `@smoke` (luồng chính) trên 5 project | ~3 phút (83 + 12 pass, 31 skip có chủ đích) |
| `pnpm test` | toàn bộ 1046 test (API + Chromium + Firefox + WebKit + Pixel 7) | lâu nhất, chạy trước buổi demo rồi mở báo cáo |
| `pnpm test:regression` | chỉ nhóm `@regression` | |
| `pnpm test:flows` | 5 luồng mua hàng xuyên suốt `@flow` | |
| `pnpm test:mock` | các test network mocking `@mock` | |
| `pnpm test:headed` | Chromium có cửa sổ, 1 worker | |
| `pnpm test:ui` | giao diện UI Mode của Playwright: chọn test, xem từng bước, xem DOM | |
| `pnpm lint` | ESLint cho code test | |

`pnpm test*` chạy **hai pha** qua `scripts/run-phases.mjs`: pha thường (mọi test trừ `@stock`), rồi pha `@stock` (test tạo đơn, đổi tồn kho). Mỗi pha reset dữ liệu riêng để test so tồn kho chính xác không bị test đặt hàng làm sai.

### 7.2 Chạy một phần

```bash
# một file, một trình duyệt
pnpm exec playwright test tests/cart/gio-hang.spec.js --project=chromium

# một test theo ID (tiêu đề test luôn bắt đầu bằng ID test case)
pnpm exec playwright test tests/admin/role.spec.js -g "TC-14" --project=chromium

# test thuộc nhóm @stock thì phải bật E2E_STOCK=1 (nếu không, Playwright bỏ qua chúng)
E2E_STOCK=1 pnpm exec playwright test tests/checkout/dat-hang.spec.js --project=chromium
```

### 7.3 Xem trình duyệt chạy bằng mắt

`E2E_SLOWMO=400` chèn 0,4 giây giữa các thao tác, `--headed` mở cửa sổ, `--workers=1` chạy lần lượt.

```bash
# Git Bash
E2E_SLOWMO=400 pnpm exec playwright test tests/product-detail/chi-tiet-giay.spec.js --project=chromium --headed --workers=1
```

```powershell
# PowerShell: đặt biến môi trường trước, cùng một dòng
$env:E2E_SLOWMO=400; pnpm exec playwright test tests/product-detail/chi-tiet-giay.spec.js --project=chromium --headed --workers=1
# xong thì xoá biến:  Remove-Item Env:E2E_SLOWMO
```

## 8. Xem báo cáo

| Báo cáo | Lệnh | Nội dung |
|---|---|---|
| Playwright HTML (pha thường) | `pnpm report` | danh sách test theo file / project, từng `test.step`, ảnh + video + trace của test lỗi |
| Playwright HTML (pha `@stock`) | `pnpm report:stock` | như trên cho pha 2 |
| Allure | `pnpm allure:generate` rồi `pnpm allure:open` | biểu đồ tổng hợp, nhóm theo suite, lịch sử, tệp đính kèm (cần Java) |
| Trace một test lỗi | `pnpm exec playwright show-trace test-results/<thư-mục-test>/trace.zip` | xem lại từng thao tác: ảnh DOM trước/sau, request mạng, console |

Muốn có trace cho cả test xanh (để minh hoạ) thì thêm `--trace on` khi chạy.

## 9. Tài khoản mẫu

| Khu vực | Email | Mật khẩu | Vai trò |
|---|---|---|---|
| Quản trị `/login` | `admin@nike.local` | `Admin@123` | toàn quyền |
| Quản trị `/login` | `noaccess@nike.local` | `Admin@123` | không có quyền nào |
| Cửa hàng `/signin` | `free@nike.local` | `Admin@123` | khách hàng |
| Cửa hàng `/signin` | `khach1@nike.local`, `khach2@nike.local` | `Admin@123` | khách hàng dành riêng cho test |

## 10. Tắt hệ thống

```bash
# backend: Ctrl+C nếu chạy tay; nếu chạy bằng script thì tìm PID đang nghe :9500
netstat -ano | grep ":9500.*LISTENING"      # cột cuối là PID
taskkill //PID <PID> //F

# hạ tầng (giữ dữ liệu)
docker compose -f docker-compose.local.yml --env-file backend/.env down
```

## 11. Lỗi thường gặp

| Hiện tượng | Nguyên nhân | Cách xử lý |
|---|---|---|
| `Backend chưa chạy ở http://localhost:9500` | chưa bật backend hoặc backend đang khởi động | làm bước 4, chờ dòng "backend sẵn sàng" |
| `Không reset được dữ liệu test: ...` | backend lên nhưng đăng nhập admin hoặc reset lỗi | xem `backend/target/backend-run.log`; thường do DB cũ, xem dòng dưới |
| Backend báo lỗi **Flyway validate** khi khởi động | DB tạo trước ngày 20/11/2026, khi migration chưa gộp thành `V1__baseline.sql` | xoá volume rồi tạo lại: `docker compose -f docker-compose.local.yml --env-file backend/.env down -v` rồi `up -d` (dữ liệu giày tự nạp lại) |
| `backend-restart: :9500 do tiến trình khác giữ` | một chương trình khác chiếm cổng 9500 | tắt chương trình đó, hoặc đổi `BACKEND_PORT` trong `backend/.env` và `API_URL` trong `automation/.env` |
| Build backend lỗi ở bước jOOQ | quên `-Djooq.codegen.skip=true` | thêm cờ như bước 4 |
| `Executable doesn't exist ... chromium` | chưa tải trình duyệt | `pnpm exec playwright install` |
| Firefox / WebKit `page.goto: Timeout 30000ms exceeded` khi chạy toàn bộ | Vite dev phải biên dịch module lần đầu cho nhiều trình duyệt cùng lúc | chạy lại; hoặc giảm worker: `E2E_WORKERS=2 pnpm test` |
| Ảnh giày không hiện | MinIO chưa chạy hoặc chưa có ảnh | `docker ps` kiểm `nike-minio`; khởi động lại backend để seed đẩy ảnh lại |
| Test `@stock` bị bỏ qua khi chạy tay | thiếu `E2E_STOCK=1` | thêm biến như mục 7.2 |
| Đăng nhập admin bị khoá tạm | sai mật khẩu quá 10 lần (test đăng nhập sai chạy nhiều lần) | chờ vài phút hoặc khởi động lại backend (bộ đếm nằm trong bộ nhớ) |
| `pnpm test --reporter=line` báo lỗi cờ lạ | pnpm hiểu `--reporter` là cờ của pnpm | dùng `pnpm exec playwright test --reporter=line` |

## 12. Các địa chỉ khi chạy local

| | |
|---|---|
| Cửa hàng | http://localhost:4500 |
| Trang quản trị | http://localhost:4500/login |
| API | http://localhost:9500/api |
| Swagger | http://localhost:9500/api/swagger-ui.html |
| MinIO console | http://localhost:9021 (`minioadmin` / `minioadmin`) |
| phpMyAdmin | http://localhost:8092 (khi bật `--profile tools`) |

## 13. Máy không có `sh` / Git Bash: chạy hoàn toàn bằng PowerShell

`sh` chỉ cần cho `scripts/ai/backend-restart.sh` (build + chạy nền backend). Docker, Maven, Java, pnpm, Playwright đều chạy thẳng trong PowerShell. Mọi lệnh dưới đây chạy từ thư mục gốc repo.

**Tạo file môi trường (bước 2):**

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
Copy-Item automation\.env.example automation\.env
```

**Hạ tầng (bước 3):** giống hệt, `docker compose -f docker-compose.local.yml --env-file backend/.env up -d`.

**Backend (bước 4), thay cho `backend-restart.sh`:**

```powershell
cd backend
mvn -q -DskipTests "-Djooq.codegen.skip=true" package
java -jar app/target/aeoc-backend.jar          # giữ cửa sổ này mở; Ctrl+C để tắt
```

Hoặc chạy nền trong cửa sổ riêng rồi chờ tới khi API trả 200:

```powershell
Start-Process java -ArgumentList '-jar','app/target/aeoc-backend.jar' -WorkingDirectory backend
while ($true) {
  try { if ((Invoke-WebRequest http://localhost:9500/api/v3/api-docs -UseBasicParsing -TimeoutSec 5).StatusCode -eq 200) { 'backend sẵn sàng'; break } } catch {}
  Start-Sleep 2
}
```

Khởi động lại sau khi sửa code: tắt backend (dòng dưới), chạy lại `mvn ... package` rồi `java -jar ...`. Phải tắt trước khi build vì Windows khoá file jar đang chạy.

**Tắt backend đang nghe cổng 9500:**

```powershell
Get-NetTCPConnection -LocalPort 9500 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

**Biến môi trường cho lệnh test:** PowerShell không có cú pháp `BIEN=giatri lệnh`. Đặt biến trước, cách nhau bằng `;`, rồi xoá khi xong (biến giữ nguyên tới khi đóng cửa sổ):

```powershell
cd automation
$env:E2E_STOCK=1; $env:E2E_SLOWMO=400; pnpm exec playwright test tests/e2e-flows/kiem-thu-hoi-quy.spec.js -g "TC-01" --project=chromium --headed --workers=1
Remove-Item Env:E2E_STOCK, Env:E2E_SLOWMO
```

Quên xoá `E2E_STOCK` thì lần chạy `pnpm exec playwright test` sau chỉ chạy nhóm `@stock`. Các lệnh `pnpm test*` không bị ảnh hưởng vì `run-phases.mjs` tự đặt biến cho từng pha.

Các lệnh `pnpm test`, `pnpm test:smoke`, `pnpm report`, `pnpm allure:*`, `pnpm check:tags` chạy bằng Node, không cần `sh`.
