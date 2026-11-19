import { Skeleton } from "@/components/ui/skeleton";

const BAR = "h-4 rounded-full bg-(--sh-surface)";

/** Khung xương trang xác nhận lúc tải đơn (plan dat-hang §6.8). */
export function OrderSkeleton() {
  return (
    <div data-testid="order-skeleton" aria-busy="true" className="flex flex-col gap-6">
      <Skeleton className="size-12 rounded-full bg-(--sh-surface)" />
      <Skeleton className={`${BAR} h-7 w-2/3`} />
      <Skeleton className={`${BAR} w-1/3`} />
      <Skeleton className={`${BAR} w-1/2`} />
      <div className="flex gap-4">
        <Skeleton className="size-20 shrink-0 rounded-none bg-(--sh-surface)" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className={`${BAR} w-3/4`} />
          <Skeleton className={`${BAR} w-1/3`} />
          <Skeleton className={`${BAR} w-1/4`} />
        </div>
      </div>
      <Skeleton className={`${BAR} w-full`} />
      <Skeleton className={`${BAR} w-full`} />
    </div>
  );
}
