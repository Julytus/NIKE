/**
 * Phí giao hàng của cửa hàng (D12, plan chi-tiet-giay §6.4 mục 11): đơn từ 5.000.000 ₫ miễn phí,
 * dưới mức đó 30.000 ₫. Lát `gio-hang` / `dat-hang` dùng lại hai hằng này.
 */
export const FREE_SHIPPING_THRESHOLD = 5_000_000;
export const SHIPPING_FEE = 30_000;

/** Số tiền còn thiếu để được miễn phí giao hàng (plan gio-hang §6.6); đã đủ → 0. */
export const amountToFreeShipping = (subtotal: number) => Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
