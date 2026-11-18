import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ProductCard } from "@/components/shop/product/product-card";
import { ProductRail } from "@/components/shop/product/product-rail";
import { Skeleton } from "@/components/ui/skeleton";
import { newArrivalsQueryOptions } from "@/lib/tanstack/options/product";
import { SectionError } from "./section-error";

/** Dải "Mới về" (plan giao-dien-nike §6.6 mục 2): đang tải 3 skeleton, lỗi + "Thử lại", 0 sản phẩm → ẩn. */
export function NewArrivalsSection() {
  const { data, isPending, isError, refetch } = useQuery(newArrivalsQueryOptions);

  if (data && data.length === 0) return null;

  let body: React.ReactNode;
  if (isPending) {
    body = (
      <ul className="flex gap-3 overflow-hidden">
        {Array.from({ length: 3 }, (_, i) => (
          <li key={i} className="shrink-0 basis-[66%] sm:basis-[45%] lg:basis-[31.5%]">
            <Skeleton className="aspect-square rounded-none bg-(--sh-surface)" />
          </li>
        ))}
      </ul>
    );
  } else if (isError) {
    body = <SectionError message="Không tải được sản phẩm mới." onRetry={() => void refetch()} />;
  }

  return (
    <section
      data-testid="home-new-arrivals"
      aria-labelledby="home-new-arrivals-title"
      aria-busy={isPending}
      className="flex flex-col"
    >
      {data ? (
        <ProductRail
          title="Mới về"
          headingId="home-new-arrivals-title"
          aside={
            <Link
              to="/w"
              search={{ nhan: "moi-ve" }}
              className="rounded-sm text-base font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50"
            >
              Xem tất cả
            </Link>
          }
        >
          {data.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} />
            </li>
          ))}
        </ProductRail>
      ) : (
        <>
          <h2 id="home-new-arrivals-title" className="mb-4 text-2xl font-medium">
            Mới về
          </h2>
          {body}
        </>
      )}
    </section>
  );
}
