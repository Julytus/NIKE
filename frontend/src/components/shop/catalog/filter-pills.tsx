import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { FILTER_GROUPS, type FilterKey, type Filters } from "@/lib/shop/catalog-search";
import { groupLabel } from "./filter-group";

const PILL =
  "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[30px] border border-[#cacacb] px-4 text-base whitespace-nowrap outline-none hover:border-(--sh-fg) focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50";

/**
 * Hàng pill lọc mobile, cuộn ngang (plan danh-sach-giay §6.6): nút tròn ⚙ "Filter" (testid `filter-open`)
 * mở ngăn kéo ở đầu; 6 pill (testid `filter-pill-<key>`) mở ngăn kéo và cuộn tới nhóm đó.
 */
export function FilterPills({
  filters,
  onOpen
}: {
  filters: Filters;
  onOpen: (group?: FilterKey) => void;
}) {
  return (
    <div className="shop-rail flex gap-2 overflow-x-auto py-2">
      <button
        type="button"
        data-testid="filter-open"
        aria-label="Filter"
        onClick={() => onOpen()}
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-[#cacacb] outline-none hover:border-(--sh-fg) focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50"
      >
        <SlidersHorizontal aria-hidden className="size-5" />
      </button>
      {FILTER_GROUPS.map((g) => (
        <button
          key={g.key}
          type="button"
          data-testid={`filter-pill-${g.key}`}
          onClick={() => onOpen(g.key)}
          className={PILL}
        >
          {groupLabel(g, filters)}
          <ChevronDown aria-hidden className="size-4" />
        </button>
      ))}
    </div>
  );
}
