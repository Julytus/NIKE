import type { ProductImageDTO } from "@/lib/types/product";
import { cn } from "@/lib/utils";

/**
 * Dãy 5 ảnh nhỏ một hàng (plan chi-tiet-giay §6.4 mục 4): tối đa 70×70, co lại khi cột hẹp (mobile 56×56), ảnh hiện tại `aria-current` + viền đen.
 * Bấm → gallery cuộn tới ảnh đó.
 */
export function ProductThumbnails({
  images,
  current,
  onSelect
}: {
  images: ProductImageDTO[];
  current: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div role="group" aria-label="Product thumbnails" className="flex gap-2">
      {images.map((img, i) => {
        const active = i === current;
        return (
          <button
            key={img.id}
            type="button"
            data-testid="pdp-thumbnail"
            aria-label={`Show image ${i + 1}`}
            aria-current={active ? "true" : undefined}
            onClick={() => onSelect(i)}
            className={cn(
              "aspect-square w-14 shrink-0 overflow-hidden rounded-[4px] border bg-(--sh-surface) outline-none focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50 lg:w-auto lg:max-w-[70px] lg:min-w-0 lg:flex-1 lg:shrink",
              active ? "border-(--sh-fg)" : "border-transparent hover:border-(--sh-border)"
            )}
          >
            <img src={img.url} alt="" loading="lazy" className="size-full object-cover" />
          </button>
        );
      })}
    </div>
  );
}
