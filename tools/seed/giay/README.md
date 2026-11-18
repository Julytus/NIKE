# Ảnh dữ liệu mẫu cửa hàng giày

`fetch-images.mjs` đọc `backend/business/src/main/resources/seed/giay/products.json`, tải 5 URL trong `sourceImages` của mỗi sản phẩm (giãn cách 1 giây), đổi sang webp rộng 1000 px, chất lượng 80, rồi ghi vào `backend/business/src/main/resources/seed/giay/<slug>/<1..5>.webp`.

```bash
cd tools/seed/giay
pnpm install
pnpm fetch-images            # chỉ tải ảnh còn thiếu
node fetch-images.mjs --force   # tải lại toàn bộ
```

Khi nào cần chạy lại:
- Thêm sản phẩm hoặc đổi `slug` / `sourceImages` trong `products.json`.
- Xoá ảnh trong `seed/giay/<slug>/` để lấy lại bản gốc.

Ảnh đã đổi được commit vào repo nên máy khác không cần mạng; backend tự đẩy ảnh lên MinIO khi khởi động và khi gọi `POST /api/test-support/reset`.

> Tên, mô tả và ảnh sản phẩm lấy từ nike.com/vn **chỉ để học tập, chạy local** (đồ án automation test), không dùng cho mục đích thương mại.
