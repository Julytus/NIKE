import { createFileRoute } from "@tanstack/react-router";
import { CartPage } from "@/components/shop/cart/cart-page";

/** Trang giỏ hàng `/cart` (plan gio-hang §6.4 → §6.10). Giỏ đọc từ localStorage nên không có loader. */
export const Route = createFileRoute("/_shop/cart")({
  head: () => ({ meta: [{ title: "Bag | Nike" }] }),
  component: CartPage
});
