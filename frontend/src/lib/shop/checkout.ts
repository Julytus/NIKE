import { useNavigate } from "@tanstack/react-router";
import { useShopSession } from "@/lib/stores/shop-session";

const CHECKOUT_PATH = "/checkout";

/**
 * Luật nút "Checkout" ở giỏ và popup "Added to Bag" (plan gio-hang §6.8, D8: thanh toán bắt buộc đăng nhập):
 * đã đăng nhập → `/checkout`; chưa → `/signin?redirect=/checkout`; phiên đang tải → `disabled`.
 */
export function useGoToCheckout(): { go: () => void; disabled: boolean } {
  const user = useShopSession((s) => s.user);
  const loading = useShopSession((s) => s.loading);
  const navigate = useNavigate();

  const go = () => {
    if (user) void navigate({ to: CHECKOUT_PATH });
    else void navigate({ to: "/signin", search: { redirect: CHECKOUT_PATH } });
  };
  return { go, disabled: loading && !user };
}
