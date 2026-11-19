import { expectedCartCheck, seedSizeOf } from './seed-products.js';

/**
 * Dữ liệu + kết quả mong đợi của lát `dat-hang` (plan/dat-hang.md §5, §9). Giá / tổng tính từ `products.json`
 * qua `expectedCartCheck` (cùng luật giỏ của lát gio-hang), không ghi cứng số trong test.
 */

/** @typedef {{ sizeId: number, quantity: number }} CartItem */
/** @typedef {{ receiverName: string, phone: string, address: string, note: string | null }} Delivery */

/** Thông tin giao hàng hợp lệ (plan §3 bước 3), tên = tên tài khoản khach1. */
export const DELIVERY = Object.freeze({
  receiverName: 'Customer One',
  phone: '0901234567',
  address: '12 Nguyen Hue Street, Ben Nghe Ward, District 1, Ho Chi Minh City',
  note: 'Please call before delivery.',
});

/** Mã đơn: "DH" + yyMMdd + 4 số (plan §4). */
export const ORDER_CODE_RE = /^DH\d{10}$/;

export const PAYMENT_COD = 'COD';
export const STATUS_PLACED = 'PLACED';

/** Message lỗi §5.5 (nguyên văn). */
export const ORDER_MESSAGES = Object.freeze({
  signIn: 'Please sign in',
  invalidToken: 'Invalid or tampered token',
  malformed: 'Malformed request body',
  emptyBag: 'Your bag is empty.',
  receiverName: "Please enter the recipient's name.",
  phone: 'Please enter a phone number.',
  address: 'Please enter a delivery address.',
  paymentMethod: 'This payment method is not available.',
  invalidRequest: 'Invalid request',
  notFound: 'Order not found.',
  missingCode: 'Missing required parameter: code',
  methodNotAllowed: 'HTTP method not supported',
  accessDenied:
    "You don't have permission to perform this action. Path: /test-support/, Action: UPDATE",
  stockNotFound: 'Not found',
  invalidStock: 'Stock must be 0 or more.',
});

/** Dòng UNAVAILABLE (size không tồn tại / sản phẩm không PUBLISHED). */
export const UNAVAILABLE_MESSAGE =
  'An item in your bag is no longer available. Please update your bag.';

/** Size Pegasus 42 dùng cho TC-18, một size cho mỗi project (`laneOf`). */
export const PEGASUS_LANES = [1603, 1604, 1605, 1606];

/**
 * Body `POST /shop-order/create` = giao hàng hợp lệ + COD + `items`, ghi đè bằng `overrides`.
 * @param {CartItem[]} items
 * @param {Record<string, unknown>} [overrides]
 */
export const orderBody = (items, overrides = {}) => ({
  ...DELIVERY,
  paymentMethod: PAYMENT_COD,
  items,
  ...overrides,
});

/** Sản phẩm + size của dữ liệu mẫu; không có thì ném lỗi (lỗi dữ liệu test). @param {number} sizeId */
function seedOf(sizeId) {
  const found = seedSizeOf(sizeId);
  if (!found) throw new Error(`size ${sizeId} không có trong products.json`);
  return found;
}

/** "<name> (<sizeLabel>) is sold out. Please update your bag." @param {number} sizeId */
export function soldOutMessage(sizeId) {
  const { product, size } = seedOf(sizeId);
  return `${product.name} (${size.sizeLabel}) is sold out. Please update your bag.`;
}

/** "Only <n> left of <name> (<sizeLabel>). Please update your bag." @param {number} sizeId @param {number} n */
export function onlyLeftMessage(sizeId, n) {
  const { product, size } = seedOf(sizeId);
  return `Only ${n} left of ${product.name} (${size.sizeLabel}). Please update your bag.`;
}

/**
 * Đơn mong đợi khi mọi dòng đều mua được (trừ `id`, `code`, `userId`, thời gian; dòng không có `id` /
 * `orderId`; `imageUrl` là đuôi `/products/<slug>/1.webp`). Dựng từ `expectedCartCheck`.
 * @param {CartItem[]} items
 * @param {Delivery} [delivery]
 */
export function expectedOrder(items, delivery = DELIVERY) {
  const check = expectedCartCheck(items);
  const notAvailable = check.items.find((l) => l.status !== 'AVAILABLE');
  if (notAvailable)
    throw new Error(`size ${notAvailable.sizeId} không mua được (${notAvailable.status})`);
  return {
    receiverName: delivery.receiverName,
    phone: delivery.phone,
    address: delivery.address,
    note: delivery.note,
    itemCount: check.itemCount,
    subtotal: check.subtotal,
    shippingFee: check.shippingFee,
    total: check.total,
    paymentMethod: PAYMENT_COD,
    status: STATUS_PLACED,
    items: check.items.map((l) => ({
      sizeId: l.sizeId,
      productId: l.productId,
      productSlug: l.slug,
      productName: l.name,
      productSubtitle: l.subtitle,
      sizeLabel: l.sizeLabel,
      imageUrl: l.imageUrl,
      unitPrice: l.unitPrice,
      quantity: l.quantity,
      lineTotal: l.lineTotal,
    })),
  };
}

/**
 * "yyMMdd" của `createdTime` dạng "2026-11-19T14:05:09" → "261119".
 * @param {string} createdTime
 */
export function yymmddOf(createdTime) {
  const [y, m, d] = createdTime.slice(0, 10).split('-');
  return `${y.slice(2)}${m}${d}`;
}
