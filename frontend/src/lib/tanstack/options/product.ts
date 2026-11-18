import { queryOptions } from "@tanstack/react-query";

import { getNewArrivals, getProductCategories, suggestProducts } from "@/lib/axios/product";

export const PRODUCTS_QUERY_KEY = ["products"] as const;

/**
 * Danh mục công khai — dùng chung cho mega menu, menu trượt và trang chủ.
 * `retry: 1` (mặc định 3 lần làm trạng thái lỗi hiện sau ~7 giây, plan giao-dien-nike §8 bước 4).
 */
export const productCategoriesQueryOptions = queryOptions({
  queryKey: [...PRODUCTS_QUERY_KEY, "categories"],
  queryFn: getProductCategories,
  staleTime: 5 * 60_000,
  retry: 1
});

export const newArrivalsQueryOptions = queryOptions({
  queryKey: [...PRODUCTS_QUERY_KEY, "new-arrivals"],
  queryFn: getNewArrivals,
  staleTime: 60_000,
  retry: 1
});

/** Gợi ý tìm kiếm; `q` đã trim, rỗng thì không gọi. */
export const createSuggestQueryOptions = (q: string) =>
  queryOptions({
    queryKey: [...PRODUCTS_QUERY_KEY, "suggest", q],
    queryFn: () => suggestProducts(q),
    enabled: q.length > 0,
    staleTime: 30_000,
    retry: 1
  });
