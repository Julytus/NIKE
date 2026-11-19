import axiosInstance from "@/lib/axios/instance";
import type { ApiResponse } from "@/lib/types/common";
import type { CreateShopOrderRequest, ShopOrderDTO } from "@/lib/types/shop-order";

/** `POST /shop-order/create` — đặt đơn COD, trừ kho trong một transaction (plan dat-hang §5.1). */
export async function createShopOrder(body: CreateShopOrderRequest): Promise<ShopOrderDTO> {
  const res = await axiosInstance.post<ApiResponse<ShopOrderDTO>>("/shop-order/create", body);
  return res.data.result;
}

/** `GET /shop-order/get?code=` — đơn của chính người đăng nhập (plan dat-hang §5.2). */
export async function getShopOrder(code: string): Promise<ShopOrderDTO> {
  const res = await axiosInstance.get<ApiResponse<ShopOrderDTO>>("/shop-order/get", {
    params: { code }
  });
  return res.data.result;
}
