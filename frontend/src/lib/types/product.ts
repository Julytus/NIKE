import type { PagedResult } from "@/lib/types/common";

/** Nhãn sản phẩm như backend lưu (plan giao-dien-nike §5.2). */
export type ProductBadge = "JUST_IN" | "BESTSELLER";

/** "Thẻ sản phẩm" — một phần tử của `new-arrivals` / `suggest` (plan giao-dien-nike §5.2, §5.3). */
export interface ProductCardDTO {
  id: number;
  slug: string;
  styleCode: string;
  name: string;
  subtitle: string;
  gender: string;
  categoryId: number;
  price: number;
  salePrice: number | null;
  badge: ProductBadge | null;
  createdTime: string;
  imageUrl: string;
  totalStock: number;
}

/** Danh mục kèm số sản phẩm đang bán + ảnh đại diện (plan giao-dien-nike §5.1). */
export interface ProductCategoryDTO {
  id: number;
  slug: string;
  name: string;
  sortOrder: number;
  productCount: number;
  /** null khi danh mục chưa có sản phẩm đang bán */
  imageUrl: string | null;
}

/** `GET /product/public/suggest` (plan giao-dien-nike §5.3). */
export type ProductSuggestDTO = PagedResult<ProductCardDTO>;
