import axiosInstance from "@/lib/axios/instance";
import type { CartCheckDTO, CartItem } from "@/lib/types/cart";
import type { ApiResponse } from "@/lib/types/common";

/** `POST /cart/public/check` — tính lại giỏ theo giá / tồn kho hiện tại (plan gio-hang §5.1). */
export async function checkCart(items: CartItem[]): Promise<CartCheckDTO> {
  const res = await axiosInstance.post<ApiResponse<CartCheckDTO>>("/cart/public/check", items);
  return res.data.result;
}
