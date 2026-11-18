import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { productCategoriesQueryOptions } from "@/lib/tanstack/options/product";
import { SectionError } from "./section-error";

const GRID = "grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5";

/**
 * "Mua theo danh mục" (plan giao-dien-nike §6.6 mục 4): ô ảnh vuông + pill tên + số sản phẩm.
 * Ẩn danh mục chưa có sản phẩm đang bán. Đang tải 5 skeleton, lỗi + "Thử lại".
 */
export function CategorySection() {
  const { data, isPending, isError, refetch } = useQuery(productCategoriesQueryOptions);

  let body: React.ReactNode;
  if (isPending) {
    body = (
      <ul className={GRID}>
        {Array.from({ length: 5 }, (_, i) => (
          <li key={i}>
            <Skeleton className="aspect-square rounded-none bg-(--sh-surface)" />
          </li>
        ))}
      </ul>
    );
  } else if (isError) {
    body = <SectionError message="Không tải được danh mục." onRetry={() => void refetch()} />;
  } else {
    body = (
      <ul className={GRID}>
        {data
          .filter((c) => c.productCount > 0)
          .map((c) => (
            <li key={c.id}>
              <Link
                to="/w/$danhMuc"
                params={{ danhMuc: c.slug }}
                data-testid="category-tile"
                className="group flex flex-col gap-3 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50 focus-visible:ring-offset-2"
              >
                <div className="relative aspect-square overflow-hidden bg-(--sh-surface)">
                  {c.imageUrl && (
                    <img
                      src={c.imageUrl}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none"
                    />
                  )}
                  <span className="absolute bottom-4 left-4 rounded-[30px] bg-(--sh-bg) px-4 py-1.5 text-base font-medium">
                    {c.name}
                  </span>
                </div>
                <span className="text-sm text-(--sh-muted)">{`${c.productCount} sản phẩm`}</span>
              </Link>
            </li>
          ))}
      </ul>
    );
  }

  return (
    <section
      data-testid="home-categories"
      aria-labelledby="home-categories-title"
      aria-busy={isPending}
      className="flex flex-col"
    >
      <h2 id="home-categories-title" className="mb-4 text-2xl font-medium">
        Mua theo danh mục
      </h2>
      {body}
    </section>
  );
}
