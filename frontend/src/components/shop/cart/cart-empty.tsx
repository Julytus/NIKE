import { Link } from "@tanstack/react-router";
import { ShopButton } from "@/components/shop/ui/shop-button";

/** Giỏ trống (plan gio-hang §6.7): câu thông báo + nút đen "Shop All Shoes" → `/w`. */
export function CartEmpty() {
  return (
    <div className="flex flex-col items-start gap-6 py-6 max-lg:items-center">
      <p data-testid="cart-empty" className="text-base">
        There are no items in your bag.
      </p>
      <ShopButton asChild variant="primary">
        <Link to="/w">Shop All Shoes</Link>
      </ShopButton>
    </div>
  );
}
