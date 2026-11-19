import { SectionError } from "@/components/shop/home/section-error";
import { ProductCard } from "@/components/shop/product/product-card";
import { ShopButton } from "@/components/shop/ui/shop-button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProductCardDTO } from "@/lib/types/product";
import { cn } from "@/lib/utils";

/** Desktop 3 cột khe 12px, hàng cách 48px; mobile 2 cột khe 4px (plan danh-sach-giay §6.4). */
const gridClass = (desktop: boolean) =>
  cn("grid", desktop ? "grid-cols-3 gap-x-3 gap-y-12" : "grid-cols-2 gap-x-1 gap-y-8");

/** Thẻ skeleton: ô vuông + 3 dòng (testid `product-card-skeleton`). */
function CardSkeleton() {
  return (
    <div data-testid="product-card-skeleton" className="flex flex-col">
      <Skeleton className="aspect-square rounded-none bg-(--sh-surface)" />
      <div className="flex flex-col gap-2 pt-3">
        <Skeleton className="h-4 w-1/3 rounded-sm bg-(--sh-surface)" />
        <Skeleton className="h-4 w-3/4 rounded-sm bg-(--sh-surface)" />
        <Skeleton className="h-4 w-1/4 rounded-sm bg-(--sh-surface)" />
      </div>
    </div>
  );
}

/** Lưới đang tải trang đầu: 6 skeleton, `aria-busy` (§6.4). */
export function ProductGridSkeleton({ desktop }: { desktop: boolean }) {
  return (
    <section
      aria-label="Products"
      data-testid="product-grid"
      aria-busy="true"
      className={gridClass(desktop)}
    >
      {Array.from({ length: 6 }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </section>
  );
}

/** Lỗi trang đầu: thay lưới bằng "Couldn't load products." + "Try Again" (§6.4). */
export function ProductGridError({ onRetry }: { onRetry: () => void }) {
  return <SectionError message="Couldn't load products." onRetry={onRetry} />;
}

/**
 * Lưới thẻ + tải thêm (§6.4): `refreshing` = đang lấy kết quả của bộ lọc mới (lưới cũ mờ 50%, `aria-busy`);
 * `loadingMore` thêm một hàng skeleton (3 desktop / 2 mobile); lỗi tải thêm hiện dưới lưới + "Try Again".
 * `sentinelRef` gắn vào phần tử canh sau thẻ cuối (hook `useLoadMore`).
 */
export function ProductGrid({
  products,
  desktop,
  refreshing,
  loadingMore,
  loadMoreError,
  onRetryLoadMore,
  sentinelRef
}: {
  products: ProductCardDTO[];
  desktop: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  loadMoreError: boolean;
  onRetryLoadMore: () => void;
  sentinelRef: (el: HTMLElement | null) => void;
}) {
  return (
    <div className="flex flex-col">
      <section
        aria-label="Products"
        data-testid="product-grid"
        aria-busy={refreshing}
        className={cn(gridClass(desktop), "transition-opacity", refreshing && "opacity-50")}
      >
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
        {loadingMore &&
          Array.from({ length: desktop ? 3 : 2 }, (_, i) => <CardSkeleton key={`more-${i}`} />)}
      </section>
      <div ref={sentinelRef} aria-hidden className="h-px" />
      {loadMoreError && (
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <p className="text-base">Couldn&apos;t load more products.</p>
          <ShopButton variant="primary" size="sm" onClick={onRetryLoadMore}>
            Try Again
          </ShopButton>
        </div>
      )}
    </div>
  );
}
