import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useIsDesktop } from "@/hooks/use-media-query";
import { useLoadMore } from "@/hooks/use-load-more";
import {
  catalogTitle,
  clearFilters,
  hasFilters,
  readFilters,
  searchTerm,
  toFilterParams,
  toggleFilter,
  toListParams,
  withFilters,
  withSort,
  type CatalogSearch,
  type CatalogSort,
  type FilterKey
} from "@/lib/shop/catalog-search";
import {
  createProductFacetsQueryOptions,
  createProductListInfiniteOptions
} from "@/lib/tanstack/options/product";
import type { ProductCategoryDTO } from "@/lib/types/product";
import { CatalogEmpty } from "./catalog-empty";
import { CatalogHeading, CatalogTitleBar } from "./catalog-title-bar";
import { CategoryLinks } from "./category-links";
import { FilterDrawer } from "./filter-drawer";
import { FilterPills } from "./filter-pills";
import { FilterSidebar } from "./filter-sidebar";
import { ProductGrid, ProductGridError, ProductGridSkeleton } from "./product-grid";
import { RelatedCategories } from "./related-categories";

/**
 * Trang danh sách `/w`, `/w/$category` (plan danh-sach-giay §6): đọc bộ lọc từ URL, gọi song song
 * `list` (tải thêm khi cuộn) và `facets`, bố cục theo `useIsDesktop()` — desktop: thanh tiêu đề dính +
 * sidebar; mobile: h1 + link danh mục + hàng pill dính, ngăn kéo "Filter".
 * Mỗi lần đổi bộ lọc / sắp xếp là một mục lịch sử mới, rồi cuộn `#app-scroll` về đầu.
 */
export function CatalogPage({
  search,
  category
}: {
  search: CatalogSearch;
  category?: ProductCategoryDTO;
}) {
  const desktop = useIsDesktop();
  const navigate = useNavigate();
  const [filtersHidden, setFiltersHidden] = useState(false);
  const [drawer, setDrawer] = useState<{ open: boolean; group?: FilterKey }>({ open: false });

  const slug = category?.slug;
  const filters = readFilters(search);
  const sort: CatalogSort = search.sort ?? "featured";
  const term = searchTerm(search);
  const title = catalogTitle(search, category?.name);

  const list = useInfiniteQuery(createProductListInfiniteOptions(toListParams(search, slug)));
  const facetsQuery = useQuery(createProductFacetsQueryOptions(toFilterParams(search, slug)));
  // `facets` lỗi → không số đếm, không làm mờ (§3 E6)
  const facets = facetsQuery.isError ? undefined : facetsQuery.data;

  const firstPage = list.data?.pages[0];
  // Đang lấy kết quả của bộ lọc mới (dữ liệu cũ là placeholder) → chưa biết `total`
  const total = list.isPlaceholderData ? undefined : firstPage?.total;
  const products = list.data?.pages.flatMap((p) => p.items) ?? [];
  const pageCount = list.data?.pages.length ?? 0;

  const sentinelRef = useLoadMore({
    enabled: list.hasNextPage && !list.isFetching && !list.isError && !list.isPlaceholderData,
    version: pageCount,
    onLoadMore: () => void list.fetchNextPage()
  });

  const go = (next: CatalogSearch) => {
    const done = slug
      ? navigate({ to: "/w/$category", params: { category: slug }, search: next })
      : navigate({ to: "/w", search: next });
    void done.then(() =>
      document.getElementById("app-scroll")?.scrollTo({ top: 0, behavior: "instant" })
    );
  };
  const onToggle = (key: FilterKey, value: string) =>
    go(withFilters(search, toggleFilter(filters, key, value)));
  const onSortChange = (next: CatalogSort) => go(withSort(search, next));

  let body: React.ReactNode;
  if (list.isPending) {
    body = <ProductGridSkeleton desktop={desktop} />;
  } else if (list.isError && !list.isFetchNextPageError) {
    body = <ProductGridError onRetry={() => void list.refetch()} />;
  } else if (total === 0) {
    body = (
      <CatalogEmpty
        filtered={hasFilters(search)}
        term={term}
        onClearFilters={() => go(clearFilters(search))}
      />
    );
  } else {
    body = (
      <ProductGrid
        products={products}
        desktop={desktop}
        refreshing={list.isPlaceholderData && list.isFetching}
        loadingMore={list.isFetchingNextPage}
        loadMoreError={list.isFetchNextPageError && !list.isFetchingNextPage}
        onRetryLoadMore={() => void list.fetchNextPage()}
        sentinelRef={sentinelRef}
      />
    );
  }

  if (desktop) {
    return (
      <div className="flex flex-col pb-16">
        <CatalogTitleBar
          title={title}
          total={total}
          isSearch={term !== undefined}
          filtersHidden={filtersHidden}
          onToggleFilters={() => setFiltersHidden((h) => !h)}
          sort={sort}
          onSortChange={onSortChange}
        />
        <div className="flex px-12 pt-2">
          <FilterSidebar
            hidden={filtersHidden}
            search={search}
            filters={filters}
            facets={facets}
            onToggle={onToggle}
          />
          <div className="min-w-0 flex-1">{body}</div>
        </div>
        <div className="px-12">
          <RelatedCategories currentSlug={slug} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-12">
      <div className="sticky top-(--sh-header-offset) z-30 flex flex-col gap-3 bg-(--sh-bg) px-4 pt-4 pb-2 transition-[top] duration-200 motion-reduce:transition-none sm:px-6">
        <CatalogHeading
          title={title}
          total={total}
          isSearch={term !== undefined}
          className="text-xl font-medium"
        />
        <CategoryLinks search={search} layout="row" />
        <FilterPills filters={filters} onOpen={(group) => setDrawer({ open: true, group })} />
      </div>
      <div className="px-4 pt-2 sm:px-6">{body}</div>
      <div className="px-4 sm:px-6">
        <RelatedCategories currentSlug={slug} />
      </div>
      <FilterDrawer
        open={drawer.open}
        onOpenChange={(open) => setDrawer((d) => ({ ...d, open }))}
        focusGroup={drawer.group}
        filters={filters}
        sort={sort}
        facets={facets}
        onApply={(d) => go(withSort(withFilters(search, d.filters), d.sort))}
      />
    </div>
  );
}
