import { SlidersHorizontal } from "lucide-react";
import type { CatalogSort } from "@/lib/shop/catalog-search";
import { SortMenu } from "./sort-menu";

/** Chữ h1 (testid `catalog-title`): `<tiêu đề> (<total>)`; chưa có `total` → chỉ tiêu đề (§6.1). */
export const headingText = (title: string, total: number | undefined) =>
  total === undefined ? title : `${title} (${total})`;

/** Dòng nhỏ "Search Results for" + h1 (dùng chung desktop / mobile). */
export function CatalogHeading({
  title,
  total,
  isSearch,
  className
}: {
  title: string;
  total?: number;
  isSearch: boolean;
  className?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col">
      {isSearch && <p className="text-sm text-(--sh-muted)">Search Results for</p>}
      <h1 data-testid="catalog-title" className={className}>
        {headingText(title, total)}
      </h1>
    </div>
  );
}

/**
 * Thanh tiêu đề desktop (plan danh-sach-giay §6.2): cao 80px, dính đầu vùng cuộn ngay dưới header
 * (`--sh-header-offset`: 60px khi header hiện, 0 khi header ẩn), nền trắng. Trái h1 24px / 500;
 * phải "Hide Filters" / "Show Filters" và "Sort By".
 */
export function CatalogTitleBar({
  title,
  total,
  isSearch,
  filtersHidden,
  onToggleFilters,
  sort,
  onSortChange
}: {
  title: string;
  total?: number;
  isSearch: boolean;
  filtersHidden: boolean;
  onToggleFilters: () => void;
  sort: CatalogSort;
  onSortChange: (sort: CatalogSort) => void;
}) {
  return (
    <div className="sticky top-(--sh-header-offset) z-30 flex h-20 items-center justify-between gap-6 bg-(--sh-bg) px-12 transition-[top] duration-200 motion-reduce:transition-none">
      <CatalogHeading
        title={title}
        total={total}
        isSearch={isSearch}
        className="truncate text-2xl font-medium"
      />
      <div className="flex shrink-0 items-center gap-6">
        <button
          type="button"
          data-testid="filter-toggle"
          onClick={onToggleFilters}
          className="inline-flex h-10 items-center gap-2 rounded-sm text-base outline-none hover:text-(--sh-muted) focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50"
        >
          {filtersHidden ? "Show Filters" : "Hide Filters"}
          <SlidersHorizontal aria-hidden className="size-5" />
        </button>
        <SortMenu value={sort} onChange={onSortChange} />
      </div>
    </div>
  );
}
