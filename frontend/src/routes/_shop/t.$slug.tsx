import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { ProductDetailPage } from "@/components/shop/product-detail/product-detail-page";
import { ProductDetailSkeleton } from "@/components/shop/product-detail/product-detail-skeleton";
import { ProductNotFound } from "@/components/shop/product-detail/product-not-found";
import { ShopError } from "@/components/shop/ui/shop-error";
import { apiErrorOf } from "@/lib/axios/error";
import { queryClient } from "@/lib/tanstack/query-client";
import { createProductDetailQueryOptions } from "@/lib/tanstack/options/product";

/**
 * Trang chi tiết giày `/t/$slug` (plan chi-tiet-giay §6, §8 bước 7). Loader chờ `get` (đã có trong cache nếu
 * khách vừa rê chuột lên thẻ); 404 → "Product Not Found"; lỗi khác → "Couldn't load this product.";
 * chậm quá 1 giây → khung xương.
 */
export const Route = createFileRoute("/_shop/t/$slug")({
  loader: async ({ params }) => {
    try {
      const product = await queryClient.ensureQueryData(createProductDetailQueryOptions(params.slug));
      return { name: product.name };
    } catch (err) {
      if (apiErrorOf(err).status === 404) throw notFound();
      throw err;
    }
  },
  head: ({ loaderData, match }) => {
    let title = "Nike";
    if (loaderData) title = `${loaderData.name} | Nike`;
    else if (match.status === "notFound") title = "Product Not Found | Nike";
    return { meta: [{ title }] };
  },
  component: ProductDetailRoute,
  pendingComponent: ProductDetailSkeleton,
  notFoundComponent: ProductNotFound,
  errorComponent: () => <ShopError title="Couldn't load this product." />
});

function ProductDetailRoute() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(createProductDetailQueryOptions(slug));
  return <ProductDetailPage key={slug} product={data} />;
}
