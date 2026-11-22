# tests/a11y — khả năng truy cập (`@a11y`)

Viết ở lát `kiem-thu-giao-dien` (plan `plan/kiem-thu-giao-dien.md` §3 L2, §5.4, §6.2). Mỗi test đưa trang về các trạng
thái cần quét (mở hộp thoại, menu, gửi form trống…) rồi gọi `scanA11y(page, testInfo, '<tên>')` ở `chromium` và
`mobile-chrome`. Không cần Docker: a11y chạy trong trình duyệt bình thường.

```bash
pnpm test:a11y                                   # hai pha, hai project
pnpm report:a11y [--title "Sau khi sửa"] [--out <file>.md]   # bảng vi phạm từ a11y-results/
```

## `scanA11y` (`utils/a11y.js`)

- `@axe-core/playwright` với tag `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`; bỏ `.tsqd-parent-container` (devtools,
  chỉ có ở Vite dev). Tham số `{ include, exclude }` để chỉ quét một vùng (vd `[role="dialog"]`).
- Ghi `a11y-results/<project>/<tên>.json` và đính kèm `axe-<tên>.json` vào test.
- **Test đỏ** khi còn vi phạm `serious` / `critical` không có trong `data/a11y-known.json`, message dạng
  `Vi phạm WCAG 2.1 AA ở <tên> (<project>): <n>` kèm từng dòng `[mức] rule × số phần tử — selector — mô tả`.
  Quét bằng `expect.soft`, nên một test quét hết mọi trạng thái rồi mới báo.
- `moderate` / `minor`: không làm đỏ, chỉ thêm annotation `a11y-warning` và hiện trong bảng `report:a11y`.
- Có `E2E_DOC_SHOTS` và có vi phạm: khoanh đỏ các phần tử vi phạm rồi chụp `a11y-<tên>[-mobile].png`.

## Danh sách chấp nhận `data/a11y-known.json`

Vi phạm chưa sửa được trong lát thì ghi vào đây để test xanh, kèm lý do và lát xử lý:

```json
{
  "rule": "color-contrast",
  "pages": ["pdp"],
  "target": ".pdp-price",
  "reason": "…",
  "ticket": "4.4"
}
```

Một vi phạm được coi là đã biết khi trùng `rule`, `pages` chứa tên quét (hoặc `"*"`), và `target` là chuỗi con của một
selector. Chỉ thêm mục khi:

- lỗi nằm trong thư viện (Radix, sonner, devtools…), hoặc
- muốn sửa phải đổi thiết kế tham chiếu `plan/ui-nike`, hoặc
- sửa xong làm đỏ E2E của lát khác mà không sửa nhỏ được.

Lỗi nằm trong code của repo, sửa được trong khoảng 30 dòng (thiếu `aria-label` / `alt` / `<label>`, ARIA sai…) thì
**sửa luôn**, không đưa vào danh sách. Sửa xong một mục thì xoá nó: `report:a11y` liệt kê "Mục chấp nhận không còn
gặp" để nhắc.

## Bảng `report:a11y`

Đọc `a11y-results/**/*.json`, in bảng Markdown: `<n> lần quét · <m> trang / trạng thái · chặn · chấp nhận · cảnh báo`,
một dòng cho mỗi (trang, thiết bị, rule), danh sách trang sạch. Có `GITHUB_STEP_SUMMARY` thì nối vào job summary (CI:
"Smoke", "Regression đêm"). Không có dữ liệu thì thoát 2. Bảng trước / sau của lát lưu ở
`docs/kiem-thu/so-lieu/2026-11-22-a11y-{truoc,sau}.md`.

## Thêm trang mới

Thêm một test (hoặc một lần `scanA11y` trong test có sẵn) cho trang / trạng thái mới, trong `describe('… @a11y')`.
`pnpm check:tags` báo lỗi nếu test ở đây thiếu `@a11y`. TC-31 (`home-injected`) chứng minh axe bắt được nút không có
tên, nên lần quét đó được đánh dấu `demo` và `report:a11y` bỏ qua.
