import { Link } from "@tanstack/react-router";
import type { ProductCardDTO } from "@/lib/types/product";
import { cn } from "@/lib/utils";
import { ProductPrice } from "./product-price";

/** Một nhãn theo thứ tự ưu tiên (plan giao-dien-nike §6.6); không có nhãn → null. */
export function productBadgeLabel(p: ProductCardDTO): string | null {
  if (p.totalStock === 0) return "Hết hàng";
  if (p.badge === "JUST_IN") return "Mới về";
  if (p.badge === "BESTSELLER") return "Bán chạy";
  if (p.salePrice != null) return "Giảm giá";
  return null;
}

/**
 * Thẻ sản phẩm: cả thẻ là link `/t/<slug>`; ảnh vuông, nhãn đỏ, tên, phụ đề, giá (§6.6). Dùng lại ở lát sau.
 * `size="sm"`: thẻ nhỏ trong khung tìm kiếm (testid `search-suggestion`).
 */
export function ProductCard({
  product,
  size = "md",
  testId = "product-card",
  onNavigate,
  className
}: {
  product: ProductCardDTO;
  size?: "md" | "sm";
  testId?: string;
  onNavigate?: () => void;
  className?: string;
}) {
  const badge = productBadgeLabel(product);
  const sm = size === "sm";

  return (
    <Link
      to="/t/$slug"
      params={{ slug: product.slug }}
      data-testid={testId}
      onClick={onNavigate}
      className={cn(
        "group flex flex-col rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50 focus-visible:ring-offset-2",
        className
      )}
    >
      <div className="aspect-square overflow-hidden bg-(--sh-surface)">
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          className="size-full object-cover transition-opacity group-hover:opacity-90"
        />
      </div>
      <div className={cn("flex flex-col pt-3", sm ? "gap-0.5 text-sm" : "gap-0.5 text-base")}>
        {badge && (
          <span data-testid="product-badge" className="font-medium text-(--sh-badge)">
            {badge}
          </span>
        )}
        <span data-testid="product-name" className="font-medium">
          {product.name}
        </span>
        <span data-testid="product-subtitle" className="text-(--sh-muted)">
          {product.subtitle}
        </span>
        <div className={sm ? "pt-1" : "pt-2"}>
          <ProductPrice product={product} />
        </div>
      </div>
    </Link>
  );
}
