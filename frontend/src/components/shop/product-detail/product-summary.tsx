import { productBadgeLabel } from "@/components/shop/product/product-card";
import { ProductPrice } from "@/components/shop/product/product-price";
import type { ProductDetailDTO } from "@/lib/types/product";

/** Nhãn · h1 tên · phụ đề · giá (plan chi-tiet-giay §6.4 mục 1 → 3). */
export function ProductSummary({ product }: { product: ProductDetailDTO }) {
  const badge = productBadgeLabel(product);
  return (
    <div className="flex flex-col">
      {badge && (
        <p data-testid="pdp-badge" className="text-base font-medium text-(--sh-badge)">
          {badge}
        </p>
      )}
      <h1 className="text-2xl font-medium">{product.name}</h1>
      <p data-testid="pdp-subtitle" className="text-base text-(--sh-muted)">
        {product.subtitle}
      </p>
      <div data-testid="pdp-price-block" className="pt-3 text-base">
        <ProductPrice product={product} variant="detail" />
      </div>
    </div>
  );
}
