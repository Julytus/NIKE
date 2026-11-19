import { redirect } from "@tanstack/react-router";
import { useAuthStore } from "@/lib/stores/auth";

/**
 * Gọi trong `beforeLoad` của trang cửa hàng bắt đăng nhập (plan dat-hang §6.1):
 * `beforeLoad: ({ location }) => requireShopSignIn(location)`. Chưa có access token → `/signin?redirect=<pathname>`,
 * đăng nhập xong trang `/signin` đưa về đúng chỗ. Dùng chung cho `/checkout`, trang xác nhận và `/orders` (lát sau).
 */
export function requireShopSignIn(location: { pathname: string }): void {
  if (!useAuthStore.getState().accessToken) {
    throw redirect({ to: "/signin", search: { redirect: location.pathname }, replace: true });
  }
}
