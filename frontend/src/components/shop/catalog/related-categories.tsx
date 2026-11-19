import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { productCategoriesQueryOptions } from "@/lib/tanstack/options/product";

/**
 * Cuối trang danh sách (plan danh-sach-giay §6.5): kẻ ngang, h2 "Related Categories", pill viền xám tới
 * mọi danh mục trừ danh mục đang xem (theo `sortOrder`, không mang theo search). testid đặt trên cả khối.
 */
export function RelatedCategories({ currentSlug }: { currentSlug?: string }) {
  const { data: categories } = useQuery(productCategoriesQueryOptions);
  if (!categories) return null;
  const others = [...categories]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((c) => c.slug !== currentSlug);
  if (others.length === 0) return null;

  return (
    <section
      data-testid="related-categories"
      aria-labelledby="related-categories-title"
      className="mt-16 border-t border-(--sh-border) pt-10"
    >
      <h2 id="related-categories-title" className="mb-6 text-2xl font-medium">
        Related Categories
      </h2>
      <ul className="flex flex-wrap gap-3">
        {others.map((c) => (
          <li key={c.id}>
            <Link
              to="/w/$category"
              params={{ category: c.slug }}
              className="inline-flex h-10 items-center rounded-[30px] border border-[#cacacb] px-5 text-base font-medium outline-none hover:border-(--sh-fg) focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50"
            >
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
