import { createFileRoute, notFound } from "@tanstack/react-router";
import { NotFoundPage } from "@/components/not-found-page";
import { CatalogPage } from "@/components/shop/catalog/catalog-page";
import { ShopError } from "@/components/shop/ui/shop-error";
import { catalogSearchSchema, catalogTitle } from "@/lib/shop/catalog-search";
import { queryClient } from "@/lib/tanstack/query-client";
import { productCategoriesQueryOptions } from "@/lib/tanstack/options/product";

/**
 * Trang danh sách theo danh mục `/w/$category` (plan danh-sach-giay §6.1, §6.7): slug không có trong
 * danh mục → 404 chung của khu cửa hàng; không tải được danh mục → "Couldn't load products." + Try Again.
 */
export const Route = createFileRoute("/_shop/w/$category")({
  validateSearch: catalogSearchSchema,
  loader: async ({ params }) => {
    const categories = await queryClient.ensureQueryData(productCategoriesQueryOptions);
    const category = categories.find((c) => c.slug === params.category);
    if (!category) throw notFound();
    return { category };
  },
  head: ({ match, loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `${catalogTitle(match.search, loaderData.category.name)} | Nike`
          : "Nike"
      }
    ]
  }),
  component: CatalogCategoryRoute,
  notFoundComponent: () => <NotFoundPage embedded home="/" />,
  errorComponent: () => <ShopError title="Couldn't load products." />
});

function CatalogCategoryRoute() {
  const search = Route.useSearch();
  const { category } = Route.useLoaderData();
  return <CatalogPage search={search} category={category} />;
}
