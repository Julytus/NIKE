import { Link } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { SectionError } from "@/components/shop/home/section-error";
import { ShopButton } from "@/components/shop/ui/shop-button";
import { Separator } from "@/components/ui/separator";
import type { CartCheckDTO, CartLineDTO } from "@/lib/types/cart";
import { formatVnd } from "@/lib/utils/money";

const HEADING_ID = "checkout-summary-title";

/**
 * Khối "Order Summary" (plan dat-hang §6.5): dòng mua được, tổng, thông báo, lỗi đặt hàng và nút "Place Order"
 * (nút submit của form giao hàng qua thuộc tính `form`). `check = null` = lỗi tải giỏ → `SectionError`, nút khoá.
 */
export function CheckoutSummary({
  check,
  lines,
  excluded,
  adjusted,
  error,
  formId,
  canPlace,
  placing,
  busy,
  onRetry
}: {
  check: CartCheckDTO | null;
  /** Dòng hiện trong danh sách (đã lọc theo giỏ hiện tại, số lượng = số mua được) */
  lines: CartLineDTO[];
  excluded: boolean;
  adjusted: boolean;
  error?: string;
  formId: string;
  canPlace: boolean;
  placing: boolean;
  /** Đang tính lại giỏ → danh sách `aria-busy` */
  busy: boolean;
  onRetry: () => void;
}) {
  return (
    <section data-testid="checkout-summary" aria-labelledby={HEADING_ID} className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={HEADING_ID} className="text-xl font-medium">
          Order Summary
        </h2>
        <Link to="/cart" className="text-sm underline underline-offset-4 hover:text-(--sh-muted)">
          Edit Bag
        </Link>
      </div>

      {check ? (
        <>
          <ul aria-label="Order items" aria-busy={busy || undefined} className="flex flex-col gap-6">
            {lines.map((line) => (
              <CheckoutItem key={line.sizeId} line={line} />
            ))}
          </ul>
          <div className="flex flex-col gap-3 text-base">
            <Separator className="bg-(--sh-border)" />
            <SummaryRow label="Subtotal" testId="checkout-subtotal" value={formatVnd(check.subtotal)} />
            <SummaryRow
              label="Delivery"
              testId="checkout-shipping"
              value={check.shippingFee === 0 ? "Free" : formatVnd(check.shippingFee)}
            />
            <Separator className="bg-(--sh-border)" />
            <SummaryRow
              label="Total"
              testId="checkout-total"
              value={formatVnd(check.total)}
              className="font-medium"
            />
          </div>
        </>
      ) : (
        <SectionError message="Couldn't load your bag." onRetry={onRetry} />
      )}

      {(excluded || adjusted) && (
        <div className="flex flex-col gap-2">
          {excluded && (
            <Notice testId="checkout-excluded-notice">
              Some items in your bag aren&apos;t available and won&apos;t be included in this order.
            </Notice>
          )}
          {adjusted && (
            <Notice testId="checkout-adjusted-notice">
              We&apos;ve updated some quantities to match available stock.
            </Notice>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {error && (
          <p role="alert" data-testid="checkout-error" className="text-sm text-(--sh-danger)">
            {error}
          </p>
        )}
        <ShopButton
          type="submit"
          form={formId}
          variant="primary"
          data-testid="checkout-place-order"
          disabled={!canPlace || placing}
          aria-busy={placing || undefined}
          className="h-[60px] w-full rounded-[30px] disabled:bg-(--sh-surface) disabled:text-(--sh-disabled) disabled:opacity-100"
        >
          {placing ? "Placing Order…" : "Place Order"}
        </ShopButton>
      </div>
    </section>
  );
}

/** Một dòng mua được: ảnh 80×80, tên, size, số lượng, giá dòng (+ giá gốc gạch ngang khi đang giảm giá). */
function CheckoutItem({ line }: { line: CartLineDTO }) {
  const quantity = line.availableQuantity;
  const name = line.name ?? "";
  return (
    <li data-testid="checkout-item" data-size-id={line.sizeId} className="flex gap-4">
      <div className="size-20 shrink-0 overflow-hidden bg-[#F5F5F5]">
        {line.imageUrl && (
          <img src={line.imageUrl} alt={name} loading="lazy" className="size-full object-cover" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
        <p data-testid="checkout-item-name" className="font-medium">
          {name}
        </p>
        <p data-testid="checkout-item-size" className="text-(--sh-muted)">
          Size {line.sizeLabel}
        </p>
        <p data-testid="checkout-item-qty" className="text-(--sh-muted)">
          Qty {quantity}
        </p>
        <p className="flex flex-wrap gap-x-2">
          <span data-testid="checkout-item-price">{formatVnd((line.unitPrice ?? 0) * quantity)}</span>
          {line.salePrice !== null && line.price !== null && (
            <s data-testid="checkout-item-original-price" className="text-(--sh-muted)">
              {formatVnd(line.price * quantity)}
            </s>
          )}
        </p>
      </div>
    </li>
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

function Notice({ testId, children }: { testId: string; children: React.ReactNode }) {
  return (
    <p data-testid={testId} className="flex items-start gap-2 text-sm text-(--sh-warning)">
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
