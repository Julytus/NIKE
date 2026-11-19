import { createFileRoute } from "@tanstack/react-router";
import { CatalogPage } from "@/components/shop/catalog/catalog-page";
import { catalogSearchSchema, catalogTitle } from "@/lib/shop/catalog-search";
import { queryClient } from "@/lib/tanstack/query-client";
import { productCategoriesQueryOptions } from "@/lib/tanstack/options/product";

/**
 * Trang danh sách mọi giày `/w` (plan danh-sach-giay §6.1). Danh mục chỉ dùng cho link
 * (lỗi → chỉ còn "All Shoes", §6.3) nên nạp trước bằng `prefetchQuery` (không ném lỗi).
 */
export const Route = createFileRoute("/_shop/w/")({
  validateSearch: catalogSearchSchema,
  loader: () => queryClient.prefetchQuery(productCategoriesQueryOptions),
  head: ({ match }) => ({ meta: [{ title: `${catalogTitle(match.search)} | Nike` }] }),
  component: CatalogIndexRoute
});

function CatalogIndexRoute() {
  const search = Route.useSearch();
  return <CatalogPage search={search} />;
}
