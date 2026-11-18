import { formatVnd } from "@/lib/utils/money";
import type { ProductCardDTO } from "@/lib/types/product";

/**
 * Giá theo quy tắc `ProductCard` (plan giao-dien-nike §6.6): không giảm → giá thường; đang giảm → giá bán,
 * dòng dưới là giá gốc trong `<s>` (chữ "Giá gốc" cho trình đọc màn hình nằm ngoài `<s>`).
 */
export function ProductPrice({ product }: { product: Pick<ProductCardDTO, "price" | "salePrice"> }) {
  const onSale = product.salePrice != null;
  return (
    <div className="flex flex-col">
      <span data-testid="product-price" className="font-medium">
        {formatVnd(onSale ? product.salePrice! : product.price)}
      </span>
      {onSale && (
        <span className="text-(--sh-muted)">
          <span className="sr-only">Giá gốc </span>
          <s>{formatVnd(product.price)}</s>
        </span>
      )}
    </div>
  );
}
