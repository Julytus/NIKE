# Nike Shoes (nike)

Đồ án: **xây dựng automation test cho web thương mại điện tử bán giày** bằng JavaScript với Playwright. Cửa hàng mô phỏng nike.com/vn (tên, logo, ảnh Nike chỉ dùng để học, chạy local, không kinh doanh). Monorepo gồm `backend/` (Spring Boot), `frontend/` (React) và `automation/` (Playwright + JS).

## Trạng thái hiện tại

| Phần | Trạng thái |
|---|---|
| Khung automation test `automation/` (POM, fixture, API client, đa trình duyệt, báo cáo, CI) | Xong, [docs/chuc-nang/khung-automation.md](docs/chuc-nang/khung-automation.md) |
| Gỡ cửa hàng LUT cũ, còn nền đăng nhập / phân quyền / MinIO / payOS | Xong, [docs/chuc-nang/go-lut.md](docs/chuc-nang/go-lut.md); `/` là trang tạm "Cửa hàng đang được nâng cấp" |
| Cửa hàng giày (dữ liệu, giao diện kiểu Nike, giỏ hàng, đặt hàng, quản trị) | Làm theo từng lát ở [plan/thiet-ke-giay.md](plan/thiet-ke-giay.md) |

Tài liệu cửa hàng LUT cũ nằm ở [docs/archive/lut/](docs/archive/lut/README.md).

## Công nghệ

| | |
|---|---|
| **Backend** | Java 21, Spring Boot 3.2, jOOQ, Flyway, MySQL 8.4, MinIO (lưu file), JWT |
| **Frontend** | React 19, Vite 7, TypeScript, TanStack Router + Query + Form, Tailwind CSS 4, shadcn/ui (Radix), zustand, zod |
| **Kiểm thử** | JUnit (backend), Playwright + axe-core (E2E, kiểm tra khả năng truy cập WCAG) |
| **Hạ tầng local** | Docker Compose: MySQL, MinIO, phpMyAdmin |

## Cấu trúc thư mục

```
backend/            Spring Boot, nhiều module Maven
  entity/           Lớp sinh từ CSDL (jOOQ codegen)
  base/             Hạ tầng dùng chung: repository, xử lý lỗi, phân quyền
  authenticate/     Đăng nhập, refresh token (bảng MySQL), đếm đăng nhập sai (bộ nhớ)
  business/         Nghiệp vụ: account, payment (payOS); các lát cửa hàng giày thêm dần
  app/              Điểm khởi chạy, cấu hình, migration Flyway (src/main/resources/db)
frontend/
  src/routes/       Trang theo file (TanStack Router): index (trang tạm), _auth/login, admin
  src/components/   shop/ (cửa hàng), admin/ (quản trị), ui/ (shadcn)
automation/         Playwright + JavaScript: tests/, pages/, fixtures/, api/, data/
plan/               Kế hoạch tổng + plan từng chức năng
docs/               Tài liệu chức năng, ảnh chụp giao diện
scripts/ai/         Script hỗ trợ (restart backend, chụp ảnh README)
```

## Chạy trên máy

Cần: JDK 21, Maven, Node 22+, pnpm, Docker.

```bash
# 1. Biến môi trường (sửa mật khẩu nếu muốn)
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 2. MySQL, MinIO
docker compose -f docker-compose.local.yml --env-file backend/.env up -d

# 3. Backend: http://localhost:9500/api
#    Lần đầu DB còn trống: Flyway tạo bảng + tài khoản mẫu, ShoeSeedRunner nạp 31 giày từ products.json
#    và đẩy ảnh lên MinIO. -Djooq.codegen.skip=true vì codegen đọc DB lúc build (DB trống → sinh schema rỗng).
cd backend && mvn -q -DskipTests "-Djooq.codegen.skip=true" package && java -jar app/target/aeoc-backend.jar
#    hoặc trên Windows / Git Bash: sh scripts/ai/backend-restart.sh "-Djooq.codegen.skip=true"

# 4. Frontend: http://localhost:4500
cd frontend && pnpm install && pnpm dev
```

Các địa chỉ khác khi chạy local:

| | |
|---|---|
| Tài liệu API (Swagger) | http://localhost:9500/api/swagger-ui.html |
| phpMyAdmin | http://localhost:8092 |
| MinIO console | http://localhost:9021 |

### Tài khoản mẫu

| Khu vực | Email | Mật khẩu | Ghi chú |
|---|---|---|---|
| Quản trị `/login` | `admin@nike.local` | `Admin@123` | Toàn quyền |
| Quản trị `/login` | `noaccess@nike.local` | `Admin@123` | Không có quyền nào |
| Cửa hàng (nút Đăng nhập) | `free@nike.local` | `Admin@123` | Khách hàng |
| Cửa hàng (nút Đăng nhập) | `khach1@nike.local`, `khach2@nike.local` | `Admin@123` | Khách hàng (dùng cho test) |

### DB tạo trước ngày 20/11/2026

Migration đã gộp thành `V1__baseline.sql` (bỏ lịch sử cửa hàng LUT cũ). DB local tạo trước đó sẽ báo lỗi Flyway validate khi khởi động: xoá volume rồi tạo lại (dữ liệu giày tự nạp lại).

```bash
docker compose -f docker-compose.local.yml --env-file backend/.env down -v
docker compose -f docker-compose.local.yml --env-file backend/.env up -d
```


## Kiểm tra chất lượng

```bash
cd frontend && pnpm build && pnpm lint
cd backend  && mvn -q "-Djooq.codegen.skip=true" test
cd automation && pnpm install && pnpm exec playwright install   # lần đầu
cd automation && pnpm test:smoke                   # nhóm @smoke, mọi trình duyệt (cần backend :9500; frontend :4500 tự bật)
cd automation && pnpm test                         # toàn bộ: api + chromium + firefox + webkit + mobile-chrome
cd automation && pnpm report                       # mở báo cáo HTML; pnpm allure:generate && pnpm allure:open cho Allure
```

Bộ automation test (Playwright + JavaScript, Page Object Model) nằm ở [`automation/`](automation/README.md); GitHub Actions chạy nhóm `@smoke` (API + Chromium) mỗi lần push / mở PR vào `main` (`.github/workflows/e2e-smoke.yml`).
Mã test JUnit của backend (`backend/**/src/test/`) đang nằm trong `.gitignore` nên chỉ có trên máy phát triển.

## Tài liệu

- [plan/thiet-ke-giay.md](plan/thiet-ke-giay.md): kế hoạch tổng cửa hàng giày, thiết kế CSDL / API và các lát chức năng.
- [plan/README.md](plan/README.md): danh sách plan.
- `docs/chuc-nang/`: tài liệu từng chức năng khi làm xong (phục vụ báo cáo).
- [docs/kiem-thu/](docs/kiem-thu/README.md): hướng dẫn cài đặt và chạy test, tài liệu học Playwright, kịch bản demo bảo vệ.
