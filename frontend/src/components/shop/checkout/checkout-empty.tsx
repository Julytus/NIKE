import { Link } from "@tanstack/react-router";
import { ShopButton } from "@/components/shop/ui/shop-button";

/**
 * Không có gì để đặt (plan dat-hang §6.6): giỏ trống → "Shop All Shoes" (`/w`);
 * giỏ còn dòng nhưng không dòng nào mua được → "Go to Bag" (`/cart`).
 */
export function CheckoutEmpty({ reason }: { reason: "empty" | "unavailable" }) {
  const empty = reason === "empty";
  return (
    <div data-testid="checkout-empty" className="flex flex-col items-start gap-6 py-6">
      <p className="text-base">
        {empty ? "Your bag is empty." : "None of the items in your bag are available right now."}
      </p>
      <ShopButton asChild variant="primary">
        {empty ? <Link to="/w">Shop All Shoes</Link> : <Link to="/cart">Go to Bag</Link>}
      </ShopButton>
    </div>
  );
}
