import { Link } from "@tanstack/react-router";
import { ShopButton } from "@/components/shop/ui/shop-button";

/**
 * Trạng thái rỗng thay lưới (plan danh-sach-giay §6.4, testid `catalog-empty`):
 * có bộ lọc → "No products match your filters." + "Clear Filters"; không bộ lọc mà có `q` →
 * `We couldn't find anything for "<q>".` + "Shop All Shoes"; không có cả hai → "No products available right now."
 */
export function CatalogEmpty({
  filtered,
  term,
  onClearFilters
}: {
  filtered: boolean;
  term?: string;
  onClearFilters: () => void;
}) {
  let body: React.ReactNode;
  if (filtered) {
    body = (
      <>
        <p className="text-xl font-medium">No products match your filters.</p>
        <ShopButton variant="outline" onClick={onClearFilters}>
          Clear Filters
        </ShopButton>
      </>
    );
  } else if (term) {
    body = (
      <>
        <p className="text-xl font-medium">{`We couldn't find anything for "${term}".`}</p>
        <p className="text-base text-(--sh-muted)">Try a different search term.</p>
        <ShopButton asChild variant="primary" className="mt-2">
          <Link to="/w">Shop All Shoes</Link>
        </ShopButton>
      </>
    );
  } else {
    body = <p className="text-xl font-medium">No products available right now.</p>;
  }

  return (
    <div data-testid="catalog-empty" className="flex flex-col items-center gap-4 py-24 text-center">
      {body}
    </div>
  );
}
