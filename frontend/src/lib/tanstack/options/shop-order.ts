import { mutationOptions, queryOptions } from "@tanstack/react-query";

import { apiErrorOf } from "@/lib/axios/error";
import { createShopOrder, getShopOrder } from "@/lib/axios/shop-order";

export const SHOP_ORDER_QUERY_KEY = ["shop-order"] as const;

/**
 * Một đơn theo mã (trang xác nhận, plan dat-hang §6.8). 404 (không có / của người khác) không thử lại;
 * lỗi khác thử lại 1 lần. Trang `/checkout` nạp sẵn đơn vừa tạo vào đúng key này.
 */
export const createShopOrderQueryOptions = (code: string) =>
  queryOptions({
    queryKey: [...SHOP_ORDER_QUERY_KEY, code],
    queryFn: () => getShopOrder(code),
    staleTime: 60_000,
    retry: (failureCount, error) => apiErrorOf(error).status !== 404 && failureCount < 1
  });

/** Đặt đơn: lỗi hiện ngay trên nút "Place Order" (`checkout-error`), nên tắt toast (§6.7 bước 4). */
export const createShopOrderMutationOptions = mutationOptions({
  mutationFn: createShopOrder,
  // Mặc định "online": mất mạng thì mutation bị tạm dừng (nút kẹt "Placing Order…") rồi tự gửi khi có mạng
  // lại, khách không bấm. "always": gửi ngay → lỗi mạng → hiện lỗi kết nối (kiem-thu-hoi-quy TC-04).
  networkMode: "always",
  meta: {
    silentError: true
  }
});
