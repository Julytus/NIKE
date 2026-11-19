import {
  FILTER_GROUPS,
  type CatalogSearch,
  type FilterKey,
  type Filters
} from "@/lib/shop/catalog-search";
import type { ProductFacetsDTO } from "@/lib/types/product";
import { cn } from "@/lib/utils";
import { CategoryLinks } from "./category-links";
import { FilterGroupSection } from "./filter-group";

/**
 * Sidebar lọc desktop (plan danh-sach-giay §6.3): `<aside aria-label="Filters">`, rộng 260px, dính dưới
 * thanh tiêu đề (80px) và cuộn riêng nếu dài hơn màn hình. "Hide Filters" → trượt sang trái, cột thu về 0
 * (`invisible` + `inert` để thật sự ẩn, lưới giãn ra). Khung ngoài dùng `overflow-clip` (không phải
 * `overflow-hidden`) để `sticky` của aside vẫn bám vùng cuộn `#app-scroll`.
 */
export function FilterSidebar({
  hidden,
  search,
  filters,
  facets,
  onToggle
}: {
  hidden: boolean;
  search: CatalogSearch;
  filters: Filters;
  facets?: ProductFacetsDTO;
  onToggle: (key: FilterKey, value: string) => void;
}) {
  return (
    <div
      className={cn(
        "shrink-0 overflow-clip transition-[width,margin,visibility] duration-300 ease-in-out motion-reduce:transition-none",
        hidden ? "invisible mr-0 w-0" : "mr-12 w-[260px]"
      )}
      inert={hidden}
    >
      <aside
        aria-label="Filters"
        data-testid="filter-sidebar"
        className={cn(
          "sticky top-[calc(var(--sh-header-offset)+80px)] max-h-[calc(100vh-var(--sh-header-offset)-80px)] w-[260px] overflow-y-auto pr-2 pb-8 transition-[top,max-height,translate] duration-200 motion-reduce:transition-none",
          hidden && "-translate-x-full"
        )}
      >
        <CategoryLinks search={search} layout="column" />
        <div className="border-b border-(--sh-border)">
          {FILTER_GROUPS.map((g) => (
            <FilterGroupSection
              key={g.key}
              group={g}
              filters={filters}
              facets={facets}
              variant="sidebar"
              idPrefix="sidebar"
              onToggle={(v) => onToggle(g.key, v)}
            />
          ))}
        </div>
      </aside>
    </div>
  );
}
