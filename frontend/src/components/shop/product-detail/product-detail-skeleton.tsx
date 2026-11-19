import { Skeleton } from "@/components/ui/skeleton";
import { useIsDesktop } from "@/hooks/use-media-query";

const bar = "rounded-sm bg-(--sh-surface)";

/** Khung xương khi `get` chậm quá 1 giây (plan chi-tiet-giay §6.7), cùng bố cục §6.1. */
export function ProductDetailSkeleton() {
  const desktop = useIsDesktop();

  const info = (
    <div className="flex flex-col gap-3">
      <Skeleton className={`h-5 w-1/4 ${bar}`} />
      <Skeleton className={`h-7 w-3/4 ${bar}`} />
      <Skeleton className={`h-5 w-1/2 ${bar}`} />
      <Skeleton className={`h-5 w-1/3 ${bar}`} />
    </div>
  );
  const sizes = (
    <div className="flex flex-col gap-3">
      <Skeleton className={`h-5 w-1/3 ${bar}`} />
      <div className={desktop ? "grid grid-cols-4 gap-2" : "grid grid-cols-3 gap-2"}>
        {Array.from({ length: 12 }, (_, i) => (
          <Skeleton key={i} className={`h-12 ${bar}`} />
        ))}
      </div>
      <Skeleton className="mt-3 h-[60px] rounded-[30px] bg-(--sh-surface)" />
    </div>
  );

  return (
    <div data-testid="pdp-skeleton" aria-busy="true" aria-label="Loading product">
      {desktop ? (
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Skeleton className="h-[calc(100vh-60px)] min-h-[480px] rounded-none bg-(--sh-surface)" />
          <div className="flex flex-col gap-10 px-12 pt-12">
            {info}
            {sizes}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6 pt-6">
          <div className="px-6">{info}</div>
          <Skeleton className="aspect-square w-full rounded-none bg-(--sh-surface)" />
          <div className="px-6">{sizes}</div>
        </div>
      )}
    </div>
  );
}
