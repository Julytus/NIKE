import { infiniteQueryOptions, keepPreviousData, queryOptions } from "@tanstack/react-query";

import { apiErrorOf } from "@/lib/axios/error";
import {
  getNewArrivals,
  getProductCategories,
  getProductDetail,
  getProductFacets,
  getRelatedProducts,
  listProducts,
  suggestProducts
} from "@/lib/axios/product";
import { CATALOG_PAGE_SIZE } from "@/lib/shop/catalog-search";
import type { ProductFilterParams, ProductListParams } from "@/lib/types/product";

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

/**
 * Lưới trang danh sách, tải thêm khi cuộn (plan danh-sach-giay §8 bước 3). `params` không có `page` / `limit`.
 * `staleTime` 60 giây để Back từ trang chi tiết dùng lại các trang đã tải (§3 A7);
 * `keepPreviousData`: đổi bộ lọc thì lưới cũ vẫn hiện (mờ) tới khi có kết quả mới.
 */
export const createProductListInfiniteOptions = (
  params: Omit<ProductListParams, "page" | "limit">
) =>
  infiniteQueryOptions({
    queryKey: [...PRODUCTS_QUERY_KEY, "list", params],
    queryFn: ({ pageParam }) =>
      listProducts({ ...params, page: pageParam, limit: CATALOG_PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((n, p) => n + p.items.length, 0);
      return loaded < last.total && last.items.length > 0 ? last.page + 1 : undefined;
    },
    staleTime: 60_000,
    retry: 1,
    placeholderData: keepPreviousData
  });

/** Số đếm của bộ lọc (plan danh-sach-giay §5.2) — không phụ thuộc sắp xếp nên `params` không có `sort`. */
export const createProductFacetsQueryOptions = (params: ProductFilterParams) =>
  queryOptions({
    queryKey: [...PRODUCTS_QUERY_KEY, "facets", params],
    queryFn: () => getProductFacets(params),
    staleTime: 60_000,
    retry: 1,
    placeholderData: keepPreviousData
  });

/**
 * Chi tiết sản phẩm `/t/$slug` (plan chi-tiet-giay §8 bước 3): route nạp bằng `ensureQueryData`, rê chuột lên
 * `ProductCard` tải sẵn. 404 (không tìm thấy) không thử lại; lỗi khác thử lại 1 lần.
 */
export const createProductDetailQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: [...PRODUCTS_QUERY_KEY, "detail", slug],
    queryFn: () => getProductDetail(slug),
    staleTime: 60_000,
    retry: (failureCount, error) => apiErrorOf(error).status !== 404 && failureCount < 1
  });

/** "You Might Also Like" của trang chi tiết (plan chi-tiet-giay §5.2, §6.6). */
export const createRelatedProductsQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: [...PRODUCTS_QUERY_KEY, "related", slug],
    queryFn: () => getRelatedProducts(slug),
    staleTime: 60_000,
    retry: 1
  });
