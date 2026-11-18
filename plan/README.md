# Plan thực thi

Mỗi file `<slug>.md` là một lát chức năng (backend + frontend + test), được lập bằng `/plan-feature <slug>` và thực hiện bằng `/cook <slug>`. Mẫu: [_template.md](_template.md). Kế hoạch tổng của đồ án (giai đoạn → lát → việc con, có đánh dấu done) nằm ở [thiet-ke-giay.md](thiet-ke-giay.md).

Một plan chỉ được cook khi `status: approved`, nghĩa là người dùng đã đọc và duyệt.

**Cửa hàng LUT (DownBeat) cũ:** thiết kế và kế hoạch tổng đã chuyển vào [../docs/archive/lut/](../docs/archive/lut/README.md) sau lát `go-lut`. Các plan LUT / AEOC trong bảng dưới chỉ để tham khảo cách viết.

**Cửa hàng giày (chuyển hướng 18/11/2026):** kế hoạch tổng, thiết kế CSDL / API và lộ trình các lát ở [thiet-ke-giay.md](thiet-ke-giay.md) (approved 18/11/2026). Đặc tả UI tham chiếu nike.com + ảnh khung hình: [ui-nike/README.md](ui-nike/README.md).

| Slug | Chức năng | Lát | Trạng thái |
|---|---|---|---|
| [khung-automation](khung-automation.md) | Khung bộ automation test `automation/` (Playwright + JS): POM, fixture, API client, 6 project trình duyệt, HTML + Allure, ESLint, CI smoke; test xác thực + Chức vụ; cập nhật CLAUDE.md / skill sang `automation/` | 0.1 | done |
| [go-lut](go-lut.md) | Gỡ toàn bộ LUT: V18 xoá 18 bảng + resource / module, xoá package BE và route / component FE, payOS chuyển sang `business.payment`, `account/me` bỏ trường gói, `/` thành trang tạm | 1.1 | done |
| [du-lieu-giay](du-lieu-giay.md) | Dữ liệu giày: V19 (`product_category`, `product`, `product_image`, `product_size`, resource `PRODUCT`), 30 sản phẩm + 1 ẩn × 5 ảnh webp từ `products.json`, nạp DB + đẩy MinIO khi khởi động, `test-support/reset` + `summary`, tài khoản `khach1@` / `khach2@` (chỉ backend) | 1.2 | done |

