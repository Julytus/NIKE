import { Link } from "@tanstack/react-router";
import { ShopButton } from "@/components/shop/ui/shop-button";

/** Đơn không có / của người khác (404, plan dat-hang §6.8) — không lộ việc đơn có tồn tại hay không. */
export function OrderNotFound() {
  return (
    <div data-testid="order-not-found" className="flex flex-col items-start gap-4">
      <h1 className="text-[28px] font-medium">Order Not Found</h1>
      <p className="text-base text-(--sh-muted)">We couldn&apos;t find this order in your account.</p>
      <ShopButton asChild variant="primary" className="mt-2">
        <Link to="/w">Continue Shopping</Link>
      </ShopButton>
    </div>
  );
}
