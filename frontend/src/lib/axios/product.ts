import axiosInstance from "@/lib/axios/instance";
import type { ApiResponse } from "@/lib/types/common";
import type { ProductCardDTO, ProductCategoryDTO, ProductSuggestDTO } from "@/lib/types/product";

/** `GET /product-category/public/list` — mọi danh mục theo `sortOrder` (plan giao-dien-nike §5.1). */
export async function getProductCategories(): Promise<ProductCategoryDTO[]> {
  const res = await axiosInstance.get<ApiResponse<ProductCategoryDTO[]>>("/product-category/public/list");
  return res.data.result;
}

/** `GET /product/public/new-arrivals` — tối đa 12 sản phẩm "Mới về" (plan giao-dien-nike §5.2). */
export async function getNewArrivals(): Promise<ProductCardDTO[]> {
  const res = await axiosInstance.get<ApiResponse<ProductCardDTO[]>>("/product/public/new-arrivals");
  return res.data.result;
}

/** `GET /product/public/suggest?q=` — tối đa 6 gợi ý + tổng số khớp (plan giao-dien-nike §5.3). */
export async function suggestProducts(q: string): Promise<ProductSuggestDTO> {
  const res = await axiosInstance.get<ApiResponse<ProductSuggestDTO>>("/product/public/suggest", { params: { q } });
  return res.data.result;
}
