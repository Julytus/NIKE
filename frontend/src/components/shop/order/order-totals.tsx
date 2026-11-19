import { Separator } from "@/components/ui/separator";
import type { PaymentMethod, ShopOrderDTO } from "@/lib/types/shop-order";
import { formatVnd } from "@/lib/utils/money";

/** Tên hiển thị của phương thức thanh toán (§6.4). */
export const PAYMENT_LABELS: Record<PaymentMethod, string> = { COD: "Cash on Delivery" };

/**
 * Tổng của một đơn (plan dat-hang §6.8 mục 6): Subtotal · Delivery ("Free" khi phí 0) · Total · Payment Method.
 * Lát `don-cua-toi` dùng lại.
 */
export function OrderTotals({
  order
}: {
  order: Pick<ShopOrderDTO, "subtotal" | "shippingFee" | "total" | "paymentMethod">;
}) {
  return (
    <div className="flex flex-col gap-3 text-base">
      <Row label="Subtotal" testId="order-subtotal" value={formatVnd(order.subtotal)} />
      <Row
        label="Delivery"
        testId="order-shipping"
        value={order.shippingFee === 0 ? "Free" : formatVnd(order.shippingFee)}
      />
      <Separator className="bg-(--sh-border)" />
      <Row label="Total" testId="order-total" value={formatVnd(order.total)} className="font-medium" />
      <Row
        label="Payment Method"
        testId="order-payment"
        value={PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}
      />
    </div>
  );
}

function Row({
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
