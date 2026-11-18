# Đặc tả UI tham chiếu nike.com/vn

Rút từ video người dùng quay ngày 18/11/2026 (1920×940, desktop). Ảnh trong thư mục này là khung hình gốc; worker frontend (agy) **phải mở ảnh tương ứng** khi làm từng màn hình.
Chữ giao diện dịch sang tiếng Việt (D6 ở [../thiet-ke-giay.md](../thiet-ke-giay.md)); tên / mô tả sản phẩm giữ tiếng Anh. Tiền `5.279.000 ₫`.

## Thông số chung

| Thuộc tính | Giá trị |
|---|---|
| Font | Helvetica Now → dùng `"Helvetica Neue", Helvetica, Arial, sans-serif` (hoặc Inter). Tiêu đề trang 24px / 500; tên sản phẩm 16px / 500; phụ đề + giá gốc 16px / 400 màu `#707072`; chữ nhỏ 12–14px |
| Màu | chữ `#111111`, phụ `#707072`, nền xám `#F5F5F5` (dải trên, nền ảnh sản phẩm), viền `#CACACB`, nhãn đỏ `#D33918` ("Mới về", "Bán chạy", "Hết hàng"), cảnh báo cam `#9E3500` ("Chỉ còn ít hàng"), lỗi `#D30005`, thành công xanh `#007D48` |
| Lề trang | 48px hai bên (desktop), 24px (mobile) |
| Nút chính | nền `#111`, chữ trắng, cao 60px (chi tiết) / 48px (giỏ), bo tròn 30px; hover nền `#707072` |
| Nút phụ | nền trắng, viền `#CACACB` 1.5px, bo tròn 30px; hover viền `#111` |
| Ảnh sản phẩm | nền `#F5F5F5`, tỉ lệ 1:1, không bo góc, không bóng |
| Lưới | 3 cột khi có sidebar (khe 12px), sidebar rộng ~260px |

## Header — ảnh 01, 05, 07, 08

- **Dải trên** (cao 36px, nền `#F5F5F5`): trái icon Jordan; phải `Tìm cửa hàng | Trợ giúp | Tham gia | Đăng nhập` (12px, gạch đứng ngăn cách).
- **Thanh chính** (cao 60px, nền trắng): trái swoosh (đen, ~60px); giữa menu `Mới & Nổi bật · Nam · Nữ · Trẻ em · Giảm giá` (16px / 500, hover gạch chân 2px); phải ô tìm kiếm bo tròn nền `#F5F5F5` (icon kính lúp + "Tìm kiếm"), icon ♡, icon túi (có số lượng nhỏ ở giữa khi giỏ có hàng).
- **Dải thông báo** (nền `#F5F5F5`): "Miễn phí giao hàng & đổi trả trong 30 ngày **Tham gia ngay** **Xem chi tiết**" (gạch chân).
- **Khi cuộn xuống** (ảnh 05): dải trên + dải thông báo ẩn; thanh chính trượt ẩn khi cuộn xuống, **hiện lại khi cuộn lên** (dính đầu trang).
- **Mega menu** (ảnh 07): rê chuột vào mục menu → bảng trắng thả xuống toàn chiều ngang, 4–5 cột (tiêu đề cột 16px / 500, link 14px màu `#707072`), phía dưới phủ mờ nhẹ. Ở dự án này các cột là: Danh mục (Lifestyle, Chạy bộ, Bóng rổ, Jordan, Bóng đá), Nổi bật (Mới về, Bán chạy, Giảm giá), Theo giá (4 khoảng giá).
- **Tìm kiếm** (ảnh 08): bấm ô tìm → khung trắng phủ phần trên (cao ~220px), swoosh bên trái, ô tìm dài ở giữa (focus sẵn), nút "Huỷ" bên phải; dưới là "Tìm kiếm phổ biến" dạng pill (vd air force 1, jordan, giày bóng rổ); phần trang phía dưới phủ xám 40%. Gõ chữ → danh sách gợi ý sản phẩm (ảnh nhỏ + tên + giá). Enter → `/w?q=...`. Esc / bấm nền xám → đóng. (Bỏ "Ask NikeAI".)

## Trang danh sách — ảnh 01, 02, 03, 04, 06

- **Thanh tiêu đề** dính đầu trang khi cuộn (dưới header): trái "Giày Bóng rổ (22)" 24px; phải "Ẩn bộ lọc ⚙" và "Sắp xếp theo ⌄" (16px). Breadcrumb nhỏ phía trên tiêu đề khi có danh mục cha.
- **Sidebar** (dính, cuộn riêng nếu dài):
  - Đầu sidebar: danh sách link danh mục con (16px / 500, không có viền).
  - Các nhóm lọc ngăn bởi đường kẻ `#E5E5E5`, tiêu đề 16px / 500 + chevron; bấm để mở / đóng (ảnh 03): checkbox vuông 20px viền `#757575`, bo 4px, chữ 16px. Thứ tự nhóm: Giới tính, Trẻ em, Khoảng giá, Giảm giá & ưu đãi, Size (lưới nút EU 3 cột).
  - Mặc định: Giới tính, Khoảng giá mở; các nhóm khác đóng.
- **Ẩn bộ lọc** (ảnh 06): sidebar trượt ra trái và biến mất, lưới giãn hết chiều ngang (vẫn 3 cột, thẻ to hơn); nút đổi thành "Hiện bộ lọc".
- **Sắp xếp**: menu thả xuống bên phải (Nổi bật · Mới nhất · Giá: Cao → Thấp · Giá: Thấp → Cao).
- **Thẻ sản phẩm** (ảnh 02): ảnh vuông; dưới ảnh cách 12px:
  1. nhãn (16px / 500, đỏ `#D33918`): "Mới về" / "Bán chạy" / "Hết hàng" (mọi size stock = 0) / "Giảm giá"
  2. tên (16px / 500, `#111`)
  3. phụ đề (16px, `#707072`): "Giày bóng rổ nam"
  4. giá (16px / 500). Đang giảm: giá bán, dòng dưới giá gốc gạch ngang màu `#707072` (ảnh 17).
  - Hover: không đổi ảnh, chỉ con trỏ tay. Cả thẻ là một link.
  - Khoảng cách giữa hai hàng thẻ ~48px.
- **Cuối danh sách** (ảnh 04): đường kẻ, "Danh mục liên quan" + các pill viền xám (link tới danh mục khác), rồi footer.
- Tải thêm khi cuộn; khi đang tải hiện khung xám (skeleton) cùng kích thước thẻ.

## Trang chi tiết — ảnh 10, 11, 13, 14, 17

- **Bố cục**: trái ~66% là gallery, phải ~33% là cột thông tin (dính khi cuộn, lề trái 48px).
- **Gallery** (ảnh 10): một dải ảnh cuộn ngang, nhìn thấy ~1,5 ảnh (ảnh đầu đầy đủ, ảnh sau lộ một phần), cao bằng chiều cao màn hình trừ header. Góc dưới phải hai nút tròn trắng ‹ › (đường kính 36px); góc dưới trái thanh chỉ vị trí (gạch ngắn, gạch đang chọn dài + đậm). Rê chuột vào ảnh → nút tròn đen kính lúp ở giữa; bấm → xem ảnh lớn toàn màn hình.
- **Cột thông tin**, từ trên xuống:
  1. Tên 24px / 500, phụ đề 16px `#707072`, giá 16px / 500 (giảm giá: giá bán + giá gốc gạch ngang + "Giảm 20%" xanh).
  2. Dãy 5 ảnh nhỏ 70×70 (Nike dùng cho màu; ở đây là 5 ảnh của sản phẩm), ảnh đang xem viền đen 1px; bấm → gallery cuộn tới ảnh đó.
  3. Nếu tổng tồn ≤ 3: dòng cảnh báo cam có icon đồng hồ "Chỉ còn ít hàng. Đặt ngay." (ảnh 14).
  4. "Chọn size" (16px / 500) bên trái, "📏 Bảng size" bên phải.
  5. Lưới size 4 cột, ô cao 48px, viền `#E5E5E5`, bo 4px, chữ "EU 40.5"; hover viền đen; đã chọn viền đen 1.5px; hết hàng: nền `#F5F5F5`, chữ `#CACACB`, không bấm được.
  6. **Lỗi chưa chọn size** (ảnh 13): chữ "Chọn size" đổi đỏ, cả lưới bọc khung viền đỏ, dưới lưới "Vui lòng chọn size." màu đỏ.
  7. Nút "Thêm vào giỏ" (đen, cao 60px), cách 12px là nút "Yêu thích ♡" (viền). Đã yêu thích: "Đã yêu thích ♥" (tim tô đen).
  8. Mô tả (16px, line-height 1.75), danh sách gạch đầu dòng: "Mã: IM4162-005", "Xuất xứ: China"; link gạch chân "Xem chi tiết sản phẩm" (mở modal mô tả đầy đủ).
  9. Accordion "Giao hàng & đổi trả miễn phí" (chevron, kẻ trên dưới). (Bỏ "Reviews".)
- **Dưới trang**: "Có thể bạn cũng thích" (ảnh 17): tiêu đề 24px, hai nút ‹ › tròn xám bên phải tiêu đề, dải thẻ cuộn ngang (thẻ ~ 1/3 chiều rộng), thanh cuộn mảnh bên dưới. (Bỏ "How Others Are Wearing It", "Complete the look".)
- **Popup "Đã thêm vào giỏ"** (ảnh 14): khung trắng bo 24px, rộng ~420px, nằm sát phải ngay dưới header; trang phía dưới phủ xám. Dòng 1: icon tròn xanh ✓ "Đã thêm vào giỏ" + nút ✕. Dòng 2: ảnh 90×90 + tên / phụ đề / "Size EU 40" / giá. Hai nút đầy chiều ngang: "Xem giỏ (1)" (viền) và "Thanh toán" (đen). Tự đóng sau 5 giây hoặc bấm ra ngoài.

## Giỏ hàng `/gio-hang` — ảnh 09, 15, 16

- Dải trên nội dung (nền `#F5F5F5`): "**MIỄN PHÍ GIAO HÀNG** Áp dụng cho đơn từ 5.000.000 ₫. Xem chi tiết."
- Hai cột, khối nội dung rộng tối đa ~1100px, căn giữa:
  - **Trái "Giỏ hàng"** (24px): mỗi dòng: ảnh 160×160, bên phải tên (16px / 500), phụ đề, "Size 40" (gạch chân, bấm mở chọn lại size), giá ở mép phải. Dưới ảnh: pill viền xám chứa 🗑 · số lượng · ＋ (khi số lượng > 1 thì 🗑 đổi thành −), cạnh đó nút tròn ♡. Dòng cảnh báo cam "Chỉ còn ít hàng. Đặt ngay." nếu size đó stock ≤ 3. Kẻ ngang giữa các dòng.
  - **Phải "Tóm tắt"** (24px): "Tạm tính ⓘ" — giá; "Phí giao hàng dự kiến" — giá (30.000 ₫, hoặc "Miễn phí" khi tạm tính ≥ 5.000.000 ₫); kẻ; "Tổng" — giá (500); kẻ; **một** nút đen cao 60px "Thanh toán" (khác Nike: không có "Thanh toán khách"; chưa đăng nhập thì sang trang đăng nhập rồi quay lại `/thanh-toan`).
- Giỏ trống (ảnh 09): "Không có sản phẩm nào trong giỏ hàng.", các số trong tóm tắt là "—", nút xám nhạt bị khoá.
- Đang tải (ảnh 15): skeleton xám cho dòng sản phẩm và tóm tắt.
- Dưới: "Yêu thích" + "Muốn xem sản phẩm yêu thích? **Tham gia** hoặc **Đăng nhập**" (đã đăng nhập: dải thẻ yêu thích), sau đó "Có thể bạn cũng thích".

## Đăng nhập — ảnh 12

Trang riêng, nền trắng, khối giữa rộng ~460px: logo swoosh + Jordan, tiêu đề 28px "Nhập email để tham gia hoặc đăng nhập.", ô email, nút "Tiếp tục" (đen, căn phải). Email đã có tài khoản → bước nhập mật khẩu; chưa có → form đăng ký (họ tên, mật khẩu).

## Footer — ảnh 18

Đường kẻ trên; 3 cột tiêu đề 14px / 500: **Tài nguyên** (Tìm cửa hàng, Trở thành thành viên, Gửi góp ý), **Trợ giúp** (Trợ giúp, Tra cứu đơn hàng, Giao hàng, Đổi trả, Phương thức thanh toán, Liên hệ), **Công ty** (Về Nike, Tin tức, Tuyển dụng); link 14px `#707072`. Góc phải "🌐 Việt Nam". Dòng cuối: "© 2026 Nike, Inc. Bảo lưu mọi quyền. · Điều khoản bán hàng · Điều khoản sử dụng · Chính sách bảo mật" (12px).

## Mobile (< 960px) — ảnh m01 → m10 (video thứ hai, 610×942)

- **Header** (m01): trái swoosh; phải 4 icon: tìm kiếm, tài khoản (👤), túi, ☰ (mở menu trượt từ phải với các mục menu chính). Không có dải trên. Dải thông báo vẫn còn dưới header.
- **Danh sách** (m01, m02):
  - Tiêu đề "Giày Bóng rổ (22)" 20px, dưới là hàng link danh mục con cuộn ngang.
  - Hàng **pill lọc cuộn ngang**: nút tròn icon ⚙ (mở ngăn kéo bộ lọc) + các pill "Giới tính ⌄", "Trẻ em ⌄", "Khoảng giá ⌄"… (viền xám, bo tròn). Khi cuộn, tiêu đề + hàng pill dính đầu trang (m02), header ẩn.
  - Lưới **2 cột**, khe 4px, ảnh sát mép; chữ dưới ảnh lề 8px, cỡ chữ 14px.
- **Ngăn kéo bộ lọc** (m03, m04): toàn màn hình, trượt từ dưới lên; tiêu đề "Bộ lọc" + nút ✕ tròn xám góc phải; nhóm đầu "Sắp xếp theo" là radio (Nổi bật, Mới nhất, Giá: Cao → Thấp, Giá: Thấp → Cao); sau đó các nhóm checkbox **luôn mở** (không thu gọn), ngăn bởi đường kẻ. Đáy ngăn kéo dính hai nút: "Xoá (n)" (viền) và "Áp dụng" (đen). Bấm pill "Giới tính ⌄" thì mở ngăn kéo và cuộn tới nhóm đó.
- **Giỏ** (m05 → m08): một cột. Tiêu đề "Giỏ hàng" căn giữa, dưới là "1 sản phẩm | 2.529.000 ₫" (giỏ trống: "— sản phẩm | —"). Dòng sản phẩm: ảnh 120px trái, phải là giá (đầu tiên), tên, phụ đề, "Size 40". Tóm tắt nằm dưới danh sách. **Nút "Thanh toán" dính đáy màn hình** (đen, đầy chiều ngang, lề 16px); giỏ trống thì nút xám khoá.
- **Footer** (m09): ba nhóm "Tài nguyên / Trợ giúp / Công ty" thành accordion (chevron), "🌐 Việt Nam" dưới cùng.
- **Đăng nhập** (m10): logo swoosh + Jordan trái trên; tiêu đề 28px "Nhập email để tham gia hoặc đăng nhập."; dòng "Việt Nam **Thay đổi**"; ô "Email*" viền xám bo 8px cao 56px; dòng nhỏ "Khi tiếp tục, bạn đồng ý với **Chính sách bảo mật** và **Điều khoản sử dụng** của Nike."; nút "Tiếp tục" đen bo tròn, căn phải. Lúc đang tải: skeleton xám. Desktop giống hệt, khối giữa rộng ~460px.
- **Chi tiết** (không có trong video, suy ra): gallery vuốt ngang toàn chiều rộng với chấm vị trí; tên / giá phía trên gallery; dãy ảnh nhỏ, lưới size 3 cột, nút "Thêm vào giỏ" và "Yêu thích" đầy chiều ngang bên dưới; popup "Đã thêm vào giỏ" thành ngăn trượt từ trên xuống.
