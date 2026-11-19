import type { CartItem, CartLineDTO } from "@/lib/types/cart";

/** Khoá localStorage của giỏ (plan gio-hang §4, D8). */
export const CART_STORAGE_KEY = "nike.cart";
/** Tối đa số đôi của một size trong giỏ (server cũng chặn, §5.2). */
export const MAX_QUANTITY = 10;
/** Tối đa số dòng (size khác nhau) trong giỏ (§5.2). */
export const MAX_LINES = 50;

const isPositiveInt = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 1;

/**
 * Làm sạch giỏ đọc từ localStorage (plan gio-hang §4): không phải mảng → `[]`; bỏ phần tử sai kiểu / `sizeId`,
 * `quantity` không phải số nguyên ≥ 1; `quantity > 10` → 10; trùng `sizeId` gộp vào dòng đầu (tối đa 10);
 * quá 50 dòng giữ 50 dòng đầu. Nhờ vậy FE không bao giờ gửi dữ liệu sai lên server.
 */
export function sanitizeCart(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  const result: CartItem[] = [];
  for (const el of raw) {
    if (typeof el !== "object" || el === null || Array.isArray(el)) continue;
    const { sizeId, quantity } = el as Record<string, unknown>;
    if (!isPositiveInt(sizeId) || !isPositiveInt(quantity)) continue;
    const existing = result.find((x) => x.sizeId === sizeId);
    if (existing) existing.quantity = Math.min(MAX_QUANTITY, existing.quantity + quantity);
    else result.push({ sizeId, quantity: Math.min(MAX_QUANTITY, quantity) });
  }
  return result.slice(0, MAX_LINES);
}

/** Đọc + làm sạch giỏ; bản làm sạch khác chuỗi đã lưu thì ghi lại. Storage bị chặn → giỏ trống. */
export function readCart(): CartItem[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(CART_STORAGE_KEY);
  } catch {
    return [];
  }
  if (raw === null) return [];
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Chuỗi không phải JSON → coi như giỏ trống
  }
  const items = sanitizeCart(parsed);
  if (JSON.stringify(items) !== raw) writeCart(items);
  return items;
}

/** Ghi giỏ vào localStorage (lỗi quota / storage bị chặn thì bỏ qua — giỏ vẫn sống trong bộ nhớ). */
export function writeCart(items: CartItem[]): void {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Bỏ qua
  }
}

/** Số trên icon túi = tổng số lượng, kể cả dòng không mua được (§6.1, §11 câu 8). */
export const cartCount = (items: CartItem[]) => items.reduce((n, x) => n + x.quantity, 0);

/** Số lượng của một size trong giỏ (0 nếu chưa có). */
export const quantityOf = (items: CartItem[], sizeId: number) =>
  items.find((x) => x.sizeId === sizeId)?.quantity ?? 0;

/**
 * Thêm một đôi (§6.2): đã có → `quantity + 1`, chưa có → thêm vào cuối. Trả `null` khi đã đủ `max`
 * (= `min(10, tồn kho)`) hoặc giỏ đã đủ 50 dòng.
 */
export function addItem(items: CartItem[], sizeId: number, max: number): CartItem[] | null {
  const current = quantityOf(items, sizeId);
  if (current >= Math.min(MAX_QUANTITY, max)) return null;
  if (current > 0) {
    return items.map((x) => (x.sizeId === sizeId ? { ...x, quantity: x.quantity + 1 } : x));
  }
  if (items.length >= MAX_LINES) return null;
  return [...items, { sizeId, quantity: 1 }];
}

/** Đặt số lượng của một dòng (kẹp trong 1–10). */
export function setQuantity(items: CartItem[], sizeId: number, quantity: number): CartItem[] {
  const q = Math.max(1, Math.min(MAX_QUANTITY, Math.trunc(quantity)));
  return items.map((x) => (x.sizeId === sizeId ? { ...x, quantity: q } : x));
}

export const removeItem = (items: CartItem[], sizeId: number): CartItem[] =>
  items.filter((x) => x.sizeId !== sizeId);

/**
 * Đổi size của một dòng (§6.5.1). `max` = `min(10, tồn kho size mới)`.
 * Size mới chưa có → thay tại chỗ (giữ vị trí), số lượng không quá `max`;
 * đã có → bỏ dòng cũ, dòng có sẵn cộng thêm số lượng, tối đa `max`.
 */
export function changeSize(items: CartItem[], fromId: number, toId: number, max: number): CartItem[] {
  const from = items.find((x) => x.sizeId === fromId);
  if (!from || fromId === toId) return items;
  const cap = Math.max(1, Math.min(MAX_QUANTITY, max));
  const target = items.find((x) => x.sizeId === toId);
  if (target) {
    return items
      .filter((x) => x.sizeId !== fromId)
      .map((x) => (x.sizeId === toId ? { ...x, quantity: Math.min(cap, x.quantity + from.quantity) } : x));
  }
  return items.map((x) => (x.sizeId === fromId ? { sizeId: toId, quantity: Math.min(cap, x.quantity) } : x));
}

/**
 * Đối soát giỏ với kết quả `check` của chính giỏ đó (§6.9): bỏ dòng size không tồn tại (`productId = null`),
 * dòng `INSUFFICIENT_STOCK` giảm về tồn kho. Không có gì đổi → trả lại đúng mảng cũ.
 */
export function reconcileCart(items: CartItem[], lines: CartLineDTO[]): CartItem[] {
  let changed = false;
  const next: CartItem[] = [];
  for (const item of items) {
    const line = lines.find((l) => l.sizeId === item.sizeId);
    if (line && line.productId === null) {
      changed = true;
      continue;
    }
    if (line?.status === "INSUFFICIENT_STOCK" && line.stock >= 1 && item.quantity > line.stock) {
      changed = true;
      next.push({ ...item, quantity: line.stock });
      continue;
    }
    next.push(item);
  }
  return changed ? next : items;
}
