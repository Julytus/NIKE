import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { CatalogSearch } from "@/lib/shop/catalog-search";
import { productCategoriesQueryOptions } from "@/lib/tanstack/options/product";
import { cn } from "@/lib/utils";

/** Link danh mục so khớp đúng đường dẫn, bỏ qua search: `/w` không sáng khi đang ở `/w/running`. */
const ACTIVE = { exact: true, includeSearch: false } as const;

/**
 * Link danh mục (plan danh-sach-giay §6.3 mục 1, §6.6): "All Shoes" → `/w` rồi 5 danh mục theo `sortOrder`.
 * Giữ mọi khoá search trừ `q`; link trang hiện tại có `aria-current="page"` (Link tự gắn), chữ đậm.
 * Danh mục chưa tải xong / lỗi → chỉ còn "All Shoes". `layout = "row"`: hàng cuộn ngang ở mobile.
 */
export function CategoryLinks({
  search,
  layout
}: {
  search: CatalogSearch;
  layout: "column" | "row";
}) {
  const { data: categories = [] } = useQuery(productCategoriesQueryOptions);
  const kept: CatalogSearch = { ...search, q: undefined };
  const linkClass = cn(
    "shrink-0 rounded-sm text-base font-medium outline-none hover:text-(--sh-muted) focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50 data-[status=active]:font-bold",
    layout === "row" && "whitespace-nowrap"
  );

  return (
    <nav
      aria-label="Categories"
      data-testid="catalog-categories"
      className={cn(
        layout === "column"
          ? "flex flex-col items-start gap-2 pb-6"
          : "shop-rail flex gap-6 overflow-x-auto pb-2"
      )}
    >
      <Link to="/w" search={kept} activeOptions={ACTIVE} className={linkClass}>
        All Shoes
      </Link>
      {[...categories]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((c) => (
          <Link
            key={c.id}
            to="/w/$category"
            params={{ category: c.slug }}
            search={kept}
            activeOptions={ACTIVE}
            className={linkClass}
          >
            {c.name}
          </Link>
        ))}
    </nav>
  );
}
