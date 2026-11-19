import { z } from "zod";
import type { CartLineDTO } from "@/lib/types/cart";
import type { CreateShopOrderRequest } from "@/lib/types/shop-order";

/** Giá trị thô của form giao hàng (plan dat-hang §6.3). */
export interface DeliveryValues {
  receiverName: string;
  phone: string;
  address: string;
  note: string;
}

export type DeliveryField = keyof DeliveryValues;

/** Thứ tự ô trên form — lỗi đầu tiên theo thứ tự này được focus. */
export const DELIVERY_FIELDS: DeliveryField[] = ["receiverName", "phone", "address", "note"];

export const EMPTY_DELIVERY: DeliveryValues = { receiverName: "", phone: "", address: "", note: "" };

/** Bỏ khoảng trắng / `.` / `-` của số điện thoại ("0901 234-567" → "0901234567"). */
export const normalizePhone = (raw: string) => raw.replace(/[\s.-]/g, "");

/**
 * Schema form giao hàng (§6.3): message nguyên văn, kiểm theo thứ tự trong bảng; mỗi ô chỉ hiện lỗi đầu tiên
 * (`toFieldErrors`). Độ dài tối đa đúng cột DB (§4); backend không kiểm định dạng SĐT / độ dài.
 */
export const deliverySchema = z.object({
  receiverName: z
    .string()
    .trim()
    .min(1, "Please enter the recipient's name.")
    .max(100, "Name must be at most 100 characters."),
  phone: z
    .string()
    .transform(normalizePhone)
    .pipe(
      z
        .string()
        .min(1, "Please enter a phone number.")
        .regex(/^0\d{9}$/, "Enter a valid 10-digit phone number starting with 0.")
    ),
  address: z
    .string()
    .trim()
    .min(1, "Please enter a delivery address.")
    .max(255, "Address must be at most 255 characters."),
  note: z.string().trim().max(255, "Delivery notes must be at most 255 characters.")
});

export type DeliveryData = z.output<typeof deliverySchema>;

/**
 * Body `POST /shop-order/create` (§6.7 bước 2): giá trị đã chuẩn hoá, ghi chú rỗng → `null`,
 * `items` = các dòng `AVAILABLE` của lần `check` mới nhất (thứ tự như giỏ).
 */
export function toCreateRequest(values: DeliveryData, lines: CartLineDTO[]): CreateShopOrderRequest {
  return {
    receiverName: values.receiverName,
    phone: values.phone,
    address: values.address,
    note: values.note || null,
    paymentMethod: "COD",
    items: lines
      .filter((l) => l.status === "AVAILABLE")
      .map((l) => ({ sizeId: l.sizeId, quantity: l.quantity }))
  };
}
