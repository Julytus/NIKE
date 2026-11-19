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

/** `GET /product/public/list` (plan danh-sach-giay §5.1). */
export type ProductListDTO = PagedResult<ProductCardDTO>;

/** Khoảng giá đang bán, cùng giá trị khoá URL `price` (plan danh-sach-giay §5.0). */
export type PriceRangeKey = "under-1m" | "1m-2m" | "2m-5m" | "5m-plus";

/** Số sản phẩm của từng lựa chọn lọc, kiểu "bỏ nhóm của chính mình" (plan danh-sach-giay §5.2). */
export interface ProductFacetsDTO {
  gender: Record<"men" | "women" | "unisex", number>;
  kids: Record<"boys" | "girls", number>;
  price: Record<PriceRangeKey, number>;
  sale: number;
  badge: Record<"just-in" | "bestseller", number>;
  /** Mọi size có trong kho của sản phẩm đang bán, tăng dần; `value` có thể là 42 hoặc 42.0 → so theo số */
  size: { value: number; label: string; count: number }[];
}

/**
 * Tham số chung của `list` / `facets` (plan danh-sach-giay §5.0, §5.1): trùng khoá URL `/w`,
 * nhiều giá trị ngăn dấu phẩy; khoá không có giá trị thì không gửi.
 */
export interface ProductFilterParams {
  category?: string;
  gender?: string;
  kids?: string;
  price?: string;
  sale?: string;
  badge?: string;
  size?: string;
  q?: string;
}

/** `GET /product/public/list`: bộ lọc + sắp xếp + phân trang. */
export interface ProductListParams extends ProductFilterParams {
  sort?: string;
  page?: number;
  limit?: number;
}
