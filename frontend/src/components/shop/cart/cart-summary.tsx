import { Separator } from "@/components/ui/separator";
import { amountToFreeShipping } from "@/lib/shop/shipping";
import type { CartCheckDTO } from "@/lib/types/cart";
import { formatVnd } from "@/lib/utils/money";

const DASH = "—";
const HEADING_ID = "cart-summary-title";

/**
 * Tóm tắt giỏ (plan gio-hang §6.6): Subtotal, Estimated Delivery & Handling ("Free" khi phí 0), Total, gợi ý miễn
 * phí giao hàng. `check = null` (giỏ trống, đang tải, lỗi, hoặc không còn dòng mua được) → ba giá trị "—".
 * `checkout` = nút Checkout (desktop đặt trong Summary; mobile dính đáy màn hình nên không truyền).
 */
export function CartSummary({
  check,
  checkout
}: {
  check: CartCheckDTO | null;
  checkout?: React.ReactNode;
}) {
  const missing = check ? amountToFreeShipping(check.subtotal) : 0;
  let shipping = DASH;
  if (check) shipping = check.shippingFee === 0 ? "Free" : formatVnd(check.shippingFee);

  return (
    <section data-testid="cart-summary" aria-labelledby={HEADING_ID} className="flex flex-col gap-6">
      <h2 id={HEADING_ID} className="text-2xl font-medium">
        Summary
      </h2>
      <div className="flex flex-col gap-3 text-base">
        <SummaryRow label="Subtotal" testId="cart-subtotal" value={check ? formatVnd(check.subtotal) : DASH} />
        <SummaryRow label="Estimated Delivery & Handling" testId="cart-shipping" value={shipping} />
        <Separator className="my-1 bg-(--sh-border)" />
        <SummaryRow
          label="Total"
          testId="cart-total"
          value={check ? formatVnd(check.total) : DASH}
          className="font-medium"
        />
        <Separator className="my-1 bg-(--sh-border)" />
        {check && check.subtotal > 0 && (
          <p
            data-testid="cart-delivery-hint"
            className={missing > 0 ? "text-sm" : "text-sm text-(--sh-success)"}
          >
            {missing > 0
              ? `Add ${formatVnd(missing)} more to get free delivery.`
              : "You qualify for free delivery."}
          </p>
        )}
      </div>
      {checkout && <div className="mt-2">{checkout}</div>}
    </section>
  );
}

function SummaryRow({
  label,
  value,
  testId,
  className
}: {
  label: string;
  value: string;
  testId: string;
  className?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className ?? ""}`}>
      <span>{label}</span>
      <span data-testid={testId} className="shrink-0 text-right">
        {value}
      </span>
    </div>
  );
}
