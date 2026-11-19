/**
 * Tham số `?redirect=` của trang `/signin` (plan dang-nhap-nike §5.2).
 * Chỉ nhận đường dẫn nội bộ để chặn open redirect; mọi giá trị khác về trang chủ.
 */
export function safeRedirect(raw: unknown): string {
  if (typeof raw !== "string" || !raw.startsWith("/")) return "/";
  // `//host` và `/\host` bị trình duyệt hiểu là URL khác origin
  if (raw[1] === "/" || raw[1] === "\\") return "/";
  // Không quay lại chính trang đăng nhập (tránh vòng lặp `/signin?redirect=/signin…`)
  if (raw.startsWith("/signin")) return "/";
  return raw;
}

/**
 * Search của link "Sign In" / "Join Us": quay lại trang đang xem (path + query, không kèm hash).
 * Dùng `<Link to="/signin" search={signInSearch(location)}>`.
 */
export function signInSearch(location: { pathname: string; searchStr: string }): {
  redirect: string;
} {
  return { redirect: `${location.pathname}${location.searchStr}` };
}
