import { useQuery } from "@tanstack/react-query";
import { SectionError } from "@/components/shop/home/section-error";
import { ProductCard } from "@/components/shop/product/product-card";
import { ProductRail } from "@/components/shop/product/product-rail";
import { Skeleton } from "@/components/ui/skeleton";
import { createRelatedProductsQueryOptions } from "@/lib/tanstack/options/product";

const TITLE = "You Might Also Like";
const HEADING_ID = "pdp-related-title";

/**
 * "You Might Also Like" (plan chi-tiet-giay §6.6): `ProductRail` + `ProductCard` theo đúng thứ tự `related`.
 * Đang tải: 3 thẻ skeleton; lỗi: "Couldn't load recommendations." + "Try Again"; mảng rỗng: ẩn cả khối.
 */
export function RelatedProducts({ slug }: { slug: string }) {
  const { data, isPending, isError, refetch } = useQuery(createRelatedProductsQueryOptions(slug));

  if (data && data.length === 0) return null;

  let body: React.ReactNode = null;
  if (isPending) {
    body = (
      <ul className="flex gap-3 overflow-hidden">
        {Array.from({ length: 3 }, (_, i) => (
          <li
            key={i}
            data-testid="product-card-skeleton"
            className="shrink-0 basis-[66%] sm:basis-[45%] lg:basis-[31.5%]"
          >
            <Skeleton className="aspect-square rounded-none bg-(--sh-surface)" />
          </li>
        ))}
      </ul>
    );
  } else if (isError) {
    body = <SectionError message="Couldn't load recommendations." onRetry={() => void refetch()} />;
  }

  return (
    <section
      data-testid="related-products"
      aria-labelledby={HEADING_ID}
      aria-busy={isPending}
      className="flex flex-col"
    >
      {data ? (
        <ProductRail title={TITLE} headingId={HEADING_ID}>
          {data.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} />
            </li>
          ))}
        </ProductRail>
      ) : (
        <>
          <h2 id={HEADING_ID} className="mb-4 text-2xl font-medium">
            {TITLE}
          </h2>
          {body}
        </>
      )}
    </section>
  );
}
