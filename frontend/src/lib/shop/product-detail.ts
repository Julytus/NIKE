import type { ProductCardDTO, ProductDetailDTO, ProductSizeDTO } from "@/lib/types/product";

/** Tồn kho từ 1 tới số này thì hiện "Just a few left. Order soon." (plan chi-tiet-giay §6.4 mục 5). */
export const LOW_STOCK_MAX = 3;

/** Sai số (px) khi xét dải ảnh đã cuộn tới cuối (plan chi-tiet-giay §6.2). */
export const GALLERY_EDGE = 4;

/**
 * Phần trăm giảm làm tròn xuống để không ghi quá mức giảm thật (§6.4 mục 3, §11 câu 6):
 * 2.119.000 → 2.000.000 = 5. Không giảm → 0.
 */
export function discountPercent(p: Pick<ProductCardDTO, "price" | "salePrice">): number {
  if (p.salePrice == null || p.price <= 0) return 0;
  return Math.floor(((p.price - p.salePrice) * 100) / p.price);
}

/** Cảnh báo sắp hết hàng: theo `stock` của size đang chọn, chưa chọn thì theo tổng tồn (§6.4 mục 5). */
export function showLowStock(
  product: Pick<ProductDetailDTO, "totalStock">,
  selectedSize: Pick<ProductSizeDTO, "stock"> | null
): boolean {
  const n = selectedSize ? selectedSize.stock : product.totalStock;
  return n >= 1 && n <= LOW_STOCK_MAX;
}

/** Phần khoá testid / cột EU của một size: 42.0 → "42", 40.5 → "40.5" (§6.4 mục 7, §6.5). */
export const sizeTestValue = (sizeValue: number) => String(Number(sizeValue));
