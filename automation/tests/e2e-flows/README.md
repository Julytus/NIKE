# tests/e2e-flows

Luồng nghiệp vụ xuyên nhiều lát, chạy như người dùng thật (vd: khách tìm giày → lọc → chi tiết → thêm giỏ → đăng nhập
→ đặt hàng). Spec ở đây chỉ ghép page object / API client đã có, không lặp lại kiểm tra chi tiết của từng lát.
Danh sách luồng hiện có: `automation/README.md` mục 7 (lát `kiem-thu-hoi-quy`, plan §3).

## Quy tắc

- Mỗi luồng là **một test**, chia chặng bằng `test.step('<chặng>', …)`; chặng cuối kiểm lại **qua API** (đơn, tồn kho…).
- Luồng nằm trong `test.describe('Luồng xuyên suốt @stock @flow')` (tạo đơn / đổi tồn kho → pha `@stock`).
- Mỗi luồng một sản phẩm + **một size riêng cho từng project**: thêm làn vào `FLOW_LANES` ở `data/flows.js` (size chưa
  spec `@stock` nào dùng, còn hàng trong `products.json`), lấy bằng `flowOf('<luồng>', testInfo)`, đầu test
  `setStockOk(flow.sizeId, FLOW_STOCK)`.
- Không dùng chung refresh token: luồng làm FE gọi `/auth/refresh` thì dùng tài khoản mới tạo trong test.
- Spec không chứa selector; thiếu thao tác thì thêm hàm vào page object.

## Lát sau nối thêm bước

Lát mới thêm **chặng** vào luồng có sẵn (không viết luồng mới nếu luồng cũ đã đi tới đúng chỗ), giữ ID cũ của luồng và
ghi vào §9 plan của lát mình. Ví dụ lát 2.4 `don-cua-toi` nối vào F1 (TC-01) sau chặng "trang xác nhận":

```js
await test.step('xem đơn ở /orders', async () => {
  await result.header.openAccountMenu(); // hàm page object của lát 2.4
  await ordersPage.open(code);
  await expect(ordersPage.status).toHaveText('Placed');
});
```

Tương tự: 2.1 `yeu-thich` thêm "♡ ở chi tiết → /favorites" vào F2 trước chặng Add to Bag; 3.2 `quan-ly-don-hang`
thêm chặng quản trị duyệt đơn (context `admin` riêng: `browser.newContext({ storageState: storageStateOf('admin') })`)
sau chặng kiểm API của F1.
