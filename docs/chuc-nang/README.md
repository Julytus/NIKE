# Tài liệu chức năng

Mỗi file là một lát chức năng, viết bởi `/doc-chuc-nang <slug>` sau khi lát hoàn thành. Ảnh ở `img/<slug>/`.

| Slug | Chức năng | Lát | Kiểm thử |
|---|---|---|---|
| [khung-automation](khung-automation.md) | Khung bộ automation test Playwright + JavaScript (POM, fixture, API client, đa trình duyệt, báo cáo, CI) | 0.1 | 39 pass + 3 skip / 42 |
| [go-lut](go-lut.md) | Gỡ toàn bộ cửa hàng LUT: V18 xoá 18 bảng, xoá package BE và route / component FE, payOS chuyển sang `business.payment`, `account/me` bỏ trường gói, `/` thành trang tạm | 1.1 | 22 TC pass (20 Playwright + 2 unit); toàn bộ 86 pass + 3 skip / 89 |

| [du-lieu-giay](du-lieu-giay.md) | Dữ liệu giày: V19 (4 bảng sản phẩm, resource `PRODUCT`), 30 sản phẩm + 1 ẩn × 5 ảnh webp từ `products.json`, nạp DB + MinIO khi khởi động, `test-support/reset` + `summary`, tài khoản `khach1@` / `khach2@` | 1.2 | 21 TC pass (14 Playwright + 7 unit); smoke 32/32 |
