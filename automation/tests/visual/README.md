# tests/visual — so ảnh giao diện (`@visual`)

Viết ở lát `kiem-thu-giao-dien` (plan `plan/kiem-thu-giao-dien.md` §3, §5, §6.1). Mỗi test mở một trang / trạng thái,
chờ trang ổn định rồi so ảnh bằng `expect(page).toHaveScreenshot('<tên>.png')` ở `chromium` (desktop) và
`mobile-chrome` (Pixel 7). `firefox` / `webkit` không chạy thư mục này.

## Vì sao trình duyệt chạy trong Docker

Font do hệ điều hành vẽ, nên ảnh chụp ở Windows không bao giờ trùng từng pixel với ảnh chụp trên CI (Ubuntu). Vì vậy
**trình duyệt luôn chạy trong image `mcr.microsoft.com/playwright:v<phiên bản>-noble`** (Playwright server). Test
runner vẫn chạy trên máy và nối tới server qua `connectOptions` với `exposeNetwork: '<loopback>'`, nên trình duyệt
trong container vẫn mở được `localhost:4500` / `:9500` / `:9000`. Ở máy và trên CI là cùng một Chromium Linux, nên chỉ
cần **một bộ ảnh chuẩn**: `__screenshots__/<project>/<tên>.png` (tên file không có hậu tố hệ điều hành).

```bash
pnpm visual:server            # bật container nike-pw-server (Docker Desktop phải chạy), in ws://127.0.0.1:3100/
pnpm visual:server status     # đang chạy? (chưa chạy → thoát 1)
pnpm visual:server stop
pnpm test:visual              # tự bật server, đặt E2E_PW_WS, chạy hai pha; thêm -g "TC-05" để lọc
```

Không đặt `E2E_PW_WS` (vd `pnpm test` thường) thì mọi test `@visual` **bỏ qua** với lý do
`Cần Playwright server Docker — …`. Không bao giờ chụp bằng trình duyệt Windows, nên không sinh nhầm ảnh chuẩn.
Lần đầu tải image khoảng 2 GB. Phiên bản image lấy từ `@playwright/test` trong `node_modules`, nên khi nâng
Playwright thì Chromium mới có thể vẽ khác vài pixel → sinh lại ảnh chuẩn.

## Ảnh ổn định thế nào

- `playwright.config.js`: `animations: 'disabled'`, `caret: 'hide'`, `scale: 'css'`, **`maxDiffPixels: 0`** (đo
  thực tế 3 lần × 2 project đều lệch 0 pixel), `stylePath: screenshot.css`.
- `screenshot.css` (chỉ áp dụng lúc chụp): tắt transition / animation, ẩn thanh cuộn, devtools TanStack và dòng gợi ý
  tài khoản dev (`signin-dev-hint`); cố định khung bảng quản trị (3 dòng đầu, cột cố định) và độ rộng mã đơn để khung
  che không xê dịch khi test khác chạy song song.
- `utils/visual.js` → `settle(page)`: chờ `networkidle`, font, hết skeleton / `aria-busy`, mọi ảnh trong khung nhìn tải
  xong (quá 15 giây thì đỏ `Ảnh chưa tải xong: <src>`), cuộn về đầu, bỏ focus. **Ảnh sản phẩm không bị che**: ảnh
  sai / vỡ khung chính là lỗi cần thấy.
- `masks(page)`: che (màu `#FF00FF`) mã đơn, thân bảng và dòng tổng số bản ghi của bảng quản trị.

## Cập nhật ảnh chuẩn

Khi cố ý đổi giao diện:

```bash
pnpm test:visual:update -g "TC-05"   # hoặc bỏ -g để sinh lại tất cả
git status --porcelain tests/visual/__screenshots__   # chỉ có .png của trang vừa đổi
```

Mở từng ảnh đổi để kiểm bằng mắt (không skeleton, ảnh sản phẩm đủ, phần động bị che) rồi mới commit. Trên CI
(`CI=true`) `updateSnapshots` là `none`: trang mới chưa có ảnh chuẩn thì đỏ hẳn, không tự ghi.

## Đọc lỗi

Ảnh khác ảnh chuẩn → `expect(page).toHaveScreenshot(expected) failed` + `<n> pixels (ratio …) are different`. Trong
`test-results*/<test>/` có `<tên>-expected.png`, `-actual.png`, `-diff.png` (đỏ = pixel khác). HTML report
(`pnpm report`) có các tab Diff / Actual / Expected / Side by side / **Slider** để kéo so sánh. Trên CI, run đỏ có
artifact `visual-diff` (`visual-diff-<shard>` ở regression) chứa bộ ba ảnh; Allure xếp vào nhóm "Khác biệt giao diện
(ảnh chụp)".

TC-15 chứng minh test bắt được thay đổi: chèn CSS đổi màu nút "Add to Bag" và dời giá 6px, rồi khẳng định so ảnh
`pdp.png` **phải** ném lỗi. Có `E2E_DOC_SHOTS` thì chép bộ ba ảnh vào thư mục ảnh tài liệu.

## Thêm trang mới

Lát nào thêm trang thì thêm một test vào `kiem-thu-giao-dien.spec.js` (trong `describe('… @visual')`, tiêu đề bắt
đầu bằng ID TC), chụp bằng `pnpm test:visual:update -g "<TC>"`, kiểm ảnh rồi commit. Trang có ngày giờ / mã sinh ngẫu
nhiên thì thêm selector vào `masks()`. `pnpm check:tags` báo lỗi nếu test ở đây thiếu `@visual`.
