import { createFileRoute } from "@tanstack/react-router";
import { OrderResultPage } from "@/components/shop/order/order-result-page";
import { requireShopSignIn } from "@/lib/shop/require-sign-in";

/** Trang xác nhận đơn `/checkout/result/$code` (plan dat-hang §6.8): bắt đăng nhập, chỉ chủ đơn xem được. */
export const Route = createFileRoute("/_shop/checkout/result/$code")({
  beforeLoad: ({ location }) => requireShopSignIn(location),
  head: () => ({ meta: [{ title: "Order Confirmation | Nike" }] }),
  component: OrderResultRoute
});

function OrderResultRoute() {
  const { code } = Route.useParams();
  return <OrderResultPage key={code} code={code} />;
}
