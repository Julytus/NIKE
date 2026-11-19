import { Skeleton } from "@/components/ui/skeleton";
import { CHECKOUT_GRID } from "./checkout-layout";

const BAR = "h-4 rounded-full bg-(--sh-surface)";

/**
 * Khung xương lần đầu tải giỏ (plan dat-hang §6.6): 4 ô nhập bên trái; bên phải mỗi dòng giỏ một khối + 3 vạch tổng.
 */
export function CheckoutSkeleton({ count }: { count: number }) {
  return (
    <div data-testid="checkout-skeleton" aria-busy="true" className={CHECKOUT_GRID}>
      <div className="flex flex-col gap-4">
        <Skeleton className={`${BAR} h-6 w-1/4`} />
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-[8px] bg-(--sh-surface)" />
        ))}
      </div>
      <div className="flex flex-col gap-6">
        <Skeleton className={`${BAR} h-6 w-1/2`} />
        {Array.from({ length: Math.max(1, count) }, (_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="size-20 shrink-0 rounded-none bg-(--sh-surface)" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className={`${BAR} w-3/4`} />
              <Skeleton className={`${BAR} w-1/3`} />
              <Skeleton className={`${BAR} w-1/4`} />
            </div>
          </div>
        ))}
        <Skeleton className={`${BAR} w-full`} />
        <Skeleton className={`${BAR} w-full`} />
        <Skeleton className={`${BAR} w-full`} />
        <Skeleton className="h-[60px] w-full rounded-[30px] bg-(--sh-surface)" />
      </div>
    </div>
  );
}
