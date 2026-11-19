# Tài liệu chức năng

Mỗi file là một lát chức năng, viết bởi `/doc-chuc-nang <slug>` sau khi lát hoàn thành. Ảnh ở `img/<slug>/`.

| Slug | Chức năng | Lát | Kiểm thử |
|---|---|---|---|
| [khung-automation](khung-automation.md) | Khung bộ automation test Playwright + JavaScript (POM, fixture, API client, đa trình duyệt, báo cáo, CI) | 0.1 | 39 pass + 3 skip / 42 |
| [go-lut](go-lut.md) | Gỡ toàn bộ cửa hàng LUT: V18 xoá 18 bảng, xoá package BE và route / component FE, payOS chuyển sang `business.payment`, `account/me` bỏ trường gói, `/` thành trang tạm | 1.1 | 22 TC pass (20 Playwright + 2 unit); toàn bộ 86 pass + 3 skip / 89 |

| [du-lieu-giay](du-lieu-giay.md) | Dữ liệu giày: V19 (4 bảng sản phẩm, resource `PRODUCT`), 30 sản phẩm + 1 ẩn × 5 ảnh webp từ `products.json`, nạp DB + MinIO khi khởi động, `test-support/reset` + `summary`, tài khoản `khach1@` / `khach2@` | 1.2 | 21 TC pass (14 Playwright + 7 unit); smoke 32/32 |
| [giao-dien-nike](giao-dien-nike.md) | Khung giao diện Nike (header, mega menu, tìm kiếm có gợi ý, dải thông báo, footer, menu mobile), trang chủ với dữ liệu thật, 15 trang thông tin, trang tạm; 3 API công khai chỉ đọc | 1.3 | 32 TC pass (30 Playwright + 2 unit); smoke 43 pass + 4 skip |
| [dang-nhap-nike](dang-nhap-nike.md) | Trang `/signin` kiểu nike.com nhập email trước (mật khẩu hoặc tạo tài khoản), `POST /account/public/check-email`, `?redirect=` chặn open redirect, mọi lối vào "Sign In" / "Join Us" thành link, xoá hộp thoại đăng nhập / đăng ký | 1.3b | 23 TC pass (20 Playwright + 3 unit); JUnit 8 test; smoke 67 pass + 21 skip |
| [danh-sach-giay](danh-sach-giay.md) | Trang `/w`, `/w/$category` thật: `GET /product/public/list` (lọc giới tính / trẻ em / giá / giảm giá / nhãn / size / từ khoá, 4 kiểu sắp xếp, 12 thẻ mỗi trang) + `GET /product/public/facets` (đếm theo lựa chọn), sidebar 6 nhóm, tải thêm khi cuộn, mobile pill + ngăn kéo "Filter" | 1.4 | 35 TC pass (31 Playwright + 4 unit); API 38/38, giao diện 15/15 + 2/2 mobile |
