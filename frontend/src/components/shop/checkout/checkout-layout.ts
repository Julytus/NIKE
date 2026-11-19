/**
 * Lưới của `/checkout` (plan dat-hang §6.2): mobile một cột (Delivery → Payment → Order Summary), desktop hai cột
 * `minmax(0,1fr) / 400px` khe 48px. Đổi bố cục bằng grid nên mọi phần tử chỉ render một lần.
 */
export const CHECKOUT_GRID =
  "grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12";
