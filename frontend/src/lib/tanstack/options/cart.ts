import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import { checkCart } from "@/lib/axios/cart";
import type { CartItem } from "@/lib/types/cart";

export const CART_QUERY_KEY = ["cart"] as const;

/**
 * Kết quả `check` của giỏ hiện tại (plan gio-hang §8 bước 3). Key chứa nguyên mảng giỏ nên mỗi lần sửa giỏ là một
 * lần gọi mới; `keepPreviousData` giữ dữ liệu cũ (danh sách `aria-busy`) tới khi có kết quả. Giỏ trống không gọi.
 */
export const createCartCheckQueryOptions = (items: CartItem[]) =>
  queryOptions({
    queryKey: [...CART_QUERY_KEY, "check", items],
    queryFn: () => checkCart(items),
    enabled: items.length > 0,
    staleTime: 0,
    placeholderData: keepPreviousData,
    retry: 1,
    refetchOnWindowFocus: true
  });
