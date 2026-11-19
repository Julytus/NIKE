import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * "Just a few left. Order soon." màu cam + icon đồng hồ (plan chi-tiet-giay §6.4 mục 5).
 * Giỏ hàng dùng lại với testid `cart-item-low-stock`, chữ 14px (plan gio-hang §6.5).
 */
export function LowStockNotice({
  testId = "pdp-low-stock",
  className
}: {
  testId?: string;
  className?: string;
}) {
  return (
    <p
      data-testid={testId}
      className={cn("flex items-center gap-2 text-base font-medium text-(--sh-warning)", className)}
    >
      <Timer aria-hidden className="size-5 shrink-0" />
      Just a few left. Order soon.
    </p>
  );
}
