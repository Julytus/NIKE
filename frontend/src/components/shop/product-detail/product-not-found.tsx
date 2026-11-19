import { Link } from "@tanstack/react-router";
import { SearchX } from "lucide-react";
import { ShopButton } from "@/components/shop/ui/shop-button";

/**
 * Slug không có / sản phẩm ẩn / nháp (plan chi-tiet-giay §6.8, §11 câu 9): khung như `ShopError`,
 * có lối đi tiếp "Shop All Shoes" và "Back to Home". Header + footer của layout vẫn hiện.
 */
export function ProductNotFound() {
  return (
    <div
      data-testid="pdp-not-found"
      className="flex flex-col items-center gap-3 px-6 py-24 text-center"
    >
      <SearchX className="size-10 text-(--sh-muted)" aria-hidden />
      <h1 className="text-2xl font-medium">Product Not Found</h1>
      <p className="max-w-md text-base text-(--sh-muted)">
        The product you&apos;re looking for isn&apos;t available. It may have been removed or the link
        may be incorrect.
      </p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <ShopButton asChild variant="primary">
          <Link to="/w">Shop All Shoes</Link>
        </ShopButton>
        <ShopButton asChild variant="outline">
          <Link to="/">Back to Home</Link>
        </ShopButton>
      </div>
    </div>
  );
}
