import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SectionError } from "@/components/shop/home/section-error";
import { RelatedProducts } from "@/components/shop/product-detail/related-products";
import { ShopButton } from "@/components/shop/ui/shop-button";
import { Separator } from "@/components/ui/separator";
import { useIsDesktop } from "@/hooks/use-media-query";
import { MAX_QUANTITY, cartCount } from "@/lib/shop/cart-storage";
import { useGoToCheckout } from "@/lib/shop/checkout";
import { useCart } from "@/lib/stores/cart";
import { createCartCheckQueryOptions } from "@/lib/tanstack/options/cart";
import { formatVnd } from "@/lib/utils/money";
import { CartEmpty } from "./cart-empty";
import { CartLine, isPurchasable } from "./cart-line";
import { CartLinesSkeleton, CartSummarySkeleton } from "./cart-skeleton";
import { CartSummary } from "./cart-summary";

/** Bỏ khoá `sizeId` khỏi bảng thông báo "đã tự giảm số lượng" (giữ nguyên object nếu không có). */
function withoutKeys(map: Record<number, number>, ...ids: number[]): Record<number, number> {
  if (!ids.some((id) => id in map)) return map;
  const next = { ...map };
  for (const id of ids) delete next[id];
  return next;
}

/**
 * Trang giỏ hàng `/cart` (plan gio-hang §6.4 → §6.10). Giỏ ở localStorage (store `useCart`), giá / tồn kho / trạng
 * thái lấy từ `POST /cart/public/check` mỗi lần giỏ đổi. Kết quả `check` của đúng giỏ hiện tại (không phải dữ liệu
 * cũ giữ tạm) được đối soát lại vào giỏ: bỏ size không tồn tại, giảm số lượng vượt tồn kho (§6.9).
 */
export function CartPage() {
  const desktop = useIsDesktop();
  const items = useCart((s) => s.items);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const changeSize = useCart((s) => s.changeSize);
  const reconcile = useCart((s) => s.reconcile);
  const checkout = useGoToCheckout();

  const { data, isPlaceholderData, isError, isFetching, refetch } = useQuery(
    createCartCheckQueryOptions(items)
  );
  // sizeId → số lượng vừa bị tự giảm về (thông báo §6.5 mục 1, giữ tới khi khách sửa dòng đó / rời trang)
  const [adjusted, setAdjusted] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!data || isPlaceholderData) return;
    const reduced = data.items.filter((l) => l.status === "INSUFFICIENT_STOCK" && l.stock >= 1);
    if (reduced.length > 0) {
      setAdjusted((prev) => {
        const next = { ...prev };
        for (const l of reduced) next[l.sizeId] = l.stock;
        return next;
      });
    }
    reconcile(data.items);
  }, [data, isPlaceholderData, reconcile]);

  const empty = items.length === 0;
  const failed = !empty && isError && !isFetching;
  const loading = !empty && !failed && !data;

  const quantities = new Map(items.map((i) => [i.sizeId, i.quantity]));
  const lines =
    data && !empty && !failed
      ? data.items.filter((l) => l.productId !== null && quantities.has(l.sizeId))
      : [];
  const summary = data && !empty && !failed && !loading && data.itemCount > 0 ? data : null;
  const relatedSlug = lines.find(isPurchasable)?.slug ?? null;
  const count = cartCount(items);

  const checkoutButton = (
    <ShopButton
      variant="primary"
      data-testid="cart-checkout"
      disabled={!summary || checkout.disabled}
      onClick={checkout.go}
      className="h-[60px] w-full rounded-[30px] disabled:bg-(--sh-surface) disabled:text-(--sh-disabled) disabled:opacity-100"
    >
      Checkout
    </ShopButton>
  );

  let body: React.ReactNode;
  if (empty) body = <CartEmpty />;
  else if (failed)
    body = (
      <div className="py-6">
        <SectionError message="Couldn't load your bag." onRetry={() => void refetch()} />
      </div>
    );
  else if (loading) body = <CartLinesSkeleton count={items.length} />;
  else
    body = (
      <ul aria-label="Bag items" aria-busy={isFetching || undefined} className="flex flex-col divide-y divide-(--sh-border)">
        {lines.map((line) => (
          <CartLine
            key={line.sizeId}
            line={line}
            quantity={quantities.get(line.sizeId) ?? line.quantity}
            adjustedTo={adjusted[line.sizeId]}
            desktop={desktop}
            onQuantityChange={(q) => {
              setAdjusted((prev) => withoutKeys(prev, line.sizeId));
              setQuantity(line.sizeId, q);
            }}
            onRemove={() => {
              setAdjusted((prev) => withoutKeys(prev, line.sizeId));
              remove(line.sizeId);
            }}
            onSizeChange={(size) => {
              setAdjusted((prev) => withoutKeys(prev, line.sizeId, size.id));
              changeSize(line.sizeId, size.id, Math.min(MAX_QUANTITY, size.stock));
            }}
          />
        ))}
      </ul>
    );

  const summaryBlock = loading ? (
    <CartSummarySkeleton />
  ) : (
    <CartSummary check={summary} checkout={desktop ? checkoutButton : undefined} />
  );
  // Khung xương lần đầu bọc cả danh sách lẫn Summary (§6.7)
  const busy = {
    "data-testid": loading ? "cart-skeleton" : undefined,
    "aria-busy": loading || undefined
  };

  return (
    <div className="mx-auto flex w-full max-w-[1148px] flex-col px-4 pt-6 pb-16 lg:px-6 lg:pt-10">
      {desktop ? (
        <div {...busy} className="grid grid-cols-[minmax(0,1fr)_350px] items-start gap-10">
          <div className="flex flex-col">
            <h1 className="text-2xl font-medium">Bag</h1>
            {body}
          </div>
          <div className="sticky top-(--sh-header-offset) pt-0 transition-[top]">{summaryBlock}</div>
        </div>
      ) : (
        <div {...busy} className="flex flex-col">
          <h1 className="text-center text-2xl font-medium">Bag</h1>
          <p data-testid="cart-mobile-summary" className="mt-1 text-center text-base">
            <span className="text-(--sh-muted)">
              {count} {count === 1 ? "item" : "items"}
            </span>
            {" | "}
            {summary ? formatVnd(summary.total) : "—"}
          </p>
          <Separator className="mt-6 bg-(--sh-border)" />
          {body}
          <div className="mt-6">{summaryBlock}</div>
        </div>
      )}

      {relatedSlug && (
        <div className="mt-20">
          <RelatedProducts slug={relatedSlug} />
        </div>
      )}

      {/* Mobile: "Checkout" dính đáy màn hình, luôn thấy khi cuộn (§6.4) */}
      {!desktop && (
        <div
          data-sticky-checkout
          className="fixed inset-x-0 bottom-0 z-40 bg-(--sh-bg) px-4 py-4 shadow-[0_-4px_12px_rgba(17,17,17,0.08)]"
        >
          {checkoutButton}
        </div>
      )}
    </div>
  );
}
