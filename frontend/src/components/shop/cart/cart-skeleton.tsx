import { Skeleton } from "@/components/ui/skeleton";

const BAR = "h-4 rounded-full bg-(--sh-surface)";

/** Khung xương các dòng giỏ lúc tải lần đầu (plan gio-hang §6.7, ảnh 15): mỗi dòng một khối. */
export function CartLinesSkeleton({ count }: { count: number }) {
  return (
    <ul className="flex flex-col divide-y divide-(--sh-border)">
      {Array.from({ length: Math.max(1, count) }, (_, i) => (
        <li key={i} className="flex gap-4 py-6 lg:gap-6">
          <div className="flex shrink-0 flex-col gap-4">
            <Skeleton className="size-[120px] rounded-none bg-(--sh-surface) lg:size-[160px]" />
            <div className="flex gap-2">
              <Skeleton className="size-8 rounded-full bg-(--sh-surface)" />
              <Skeleton className="size-8 rounded-full bg-(--sh-surface)" />
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-3">
            <Skeleton className={`${BAR} w-3/4`} />
            <Skeleton className={`${BAR} w-1/2`} />
            <Skeleton className={`${BAR} w-1/3`} />
            <Skeleton className={`${BAR} w-1/4`} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Khung xương Summary: 4 vạch + nút xám. */
export function CartSummarySkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className={`${BAR} h-6 w-1/3`} />
      <Skeleton className={`${BAR} w-full`} />
      <Skeleton className={`${BAR} w-full`} />
      <Skeleton className={`${BAR} w-full`} />
      <Skeleton className="mt-4 h-[60px] w-full rounded-[30px] bg-(--sh-surface)" />
    </div>
  );
}
