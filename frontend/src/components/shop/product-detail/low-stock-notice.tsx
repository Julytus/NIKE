import { Timer } from "lucide-react";

/** "Just a few left. Order soon." màu cam + icon đồng hồ (plan chi-tiet-giay §6.4 mục 5). */
export function LowStockNotice() {
  return (
    <p data-testid="pdp-low-stock" className="flex items-center gap-2 text-base font-medium text-(--sh-warning)">
      <Timer aria-hidden className="size-5 shrink-0" />
      Just a few left. Order soon.
    </p>
  );
}
