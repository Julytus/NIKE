/** Một dòng giỏ lưu ở localStorage `nike.cart` và gửi lên `POST /cart/public/check` (plan gio-hang §4, §5.1). */
export interface CartItem {
  sizeId: number;
  quantity: number;
}

/**
 * Trạng thái dòng (plan gio-hang §5.1): `AVAILABLE` tồn ≥ số lượng · `INSUFFICIENT_STOCK` 0 < tồn < số lượng ·
 * `OUT_OF_STOCK` tồn 0 · `UNAVAILABLE` size không tồn tại hoặc sản phẩm không còn bán.
 */
export type CartLineStatus = "AVAILABLE" | "INSUFFICIENT_STOCK" | "OUT_OF_STOCK" | "UNAVAILABLE";

/** Một dòng kết quả `check`; mọi field thông tin là `null` khi size không tồn tại. */
export interface CartLineDTO {
  sizeId: number;
  quantity: number;
  status: CartLineStatus;
  availableQuantity: number;
  stock: number;
  productId: number | null;
  slug: string | null;
  name: string | null;
  subtitle: string | null;
  imageUrl: string | null;
  sizeLabel: string | null;
  price: number | null;
  salePrice: number | null;
  unitPrice: number | null;
  lineTotal: number;
}

/** `result` của `POST /cart/public/check` (plan gio-hang §5.1). */
export interface CartCheckDTO {
  items: CartLineDTO[];
  itemCount: number;
  subtotal: number;
  shippingFee: number;
  total: number;
}
