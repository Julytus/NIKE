import { createFileRoute } from "@tanstack/react-router";
import { CheckoutPage } from "@/components/shop/checkout/checkout-page";
import { requireShopSignIn } from "@/lib/shop/require-sign-in";

/** Trang đặt hàng `/checkout` (plan dat-hang §6.1 → §6.7): bắt đăng nhập; giỏ đọc từ localStorage nên không có loader. */
export const Route = createFileRoute("/_shop/checkout/")({
  beforeLoad: ({ location }) => requireShopSignIn(location),
  head: () => ({ meta: [{ title: "Checkout | Nike" }] }),
  component: CheckoutPage
});
