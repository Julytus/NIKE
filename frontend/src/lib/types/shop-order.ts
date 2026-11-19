import type { CartItem } from "@/lib/types/cart";

/** Phương thức thanh toán (plan dat-hang §5.1); lát `thanh-toan-payos` thêm "PAYOS". */
export type PaymentMethod = "COD";

/** Trạng thái đơn; lát này chỉ sinh "PLACED". */
export type ShopOrderStatus = "PLACED";

/** Một dòng đơn — thông tin sản phẩm chụp lại lúc đặt (plan dat-hang §5.1). */
export interface ShopOrderItemDTO {
  id: number;
  orderId: number;
  sizeId: number;
  productId: number;
  productSlug: string;
  productName: string;
  productSubtitle: string | null;
  sizeLabel: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

/** `result` của `POST /shop-order/create` và `GET /shop-order/get` (plan dat-hang §5.1, §5.2). */
export interface ShopOrderDTO {
  id: number;
  code: string;
  userId: number;
  receiverName: string;
  phone: string;
  address: string;
  note: string | null;
  itemCount: number;
  subtotal: number;
  shippingFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: ShopOrderStatus;
  createdTime: string;
  updatedTime: string;
  items: ShopOrderItemDTO[];
}

/** Body `POST /shop-order/create`; giá / tổng do server tính lại từ DB. */
export interface CreateShopOrderRequest {
  receiverName: string;
  phone: string;
  address: string;
  note: string | null;
  paymentMethod: PaymentMethod;
  items: CartItem[];
}
