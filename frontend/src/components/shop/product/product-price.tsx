import { discountPercent } from "@/lib/shop/product-detail";
import { formatVnd } from "@/lib/utils/money";
import type { ProductCardDTO } from "@/lib/types/product";

/**
 * Giá theo quy tắc `ProductCard` (plan giao-dien-nike §6.6): không giảm → giá thường; đang giảm → giá bán,
 * dòng dưới là giá gốc trong `<s>` (chữ "Original price" cho trình đọc màn hình nằm ngoài `<s>`).
 * `variant="detail"` (trang chi tiết, plan chi-tiet-giay §6.4 mục 3): một hàng giá bán · giá gốc · "<n>% off".
 */
export function ProductPrice({
  product,
  variant = "card"
}: {
  product: Pick<ProductCardDTO, "price" | "salePrice">;
  variant?: "card" | "detail";
}) {
  const onSale = product.salePrice != null;
  const current = (
    <span data-testid="product-price" className="font-medium">
      {formatVnd(onSale ? product.salePrice! : product.price)}
    </span>
  );
  const original = onSale && (
    <span className="text-(--sh-muted)">
      <span className="sr-only">Original price </span>
      <s>{formatVnd(product.price)}</s>
    </span>
  );

  if (variant === "detail") {
    const percent = discountPercent(product);
    return (
      <div className="flex flex-wrap items-baseline gap-x-2 font-medium">
        {current}
        {original}
        {percent >= 1 && (
          <span data-testid="pdp-discount" className="text-(--sh-success)">
            {percent}% off
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {current}
      {original}
    </div>
  );
}
