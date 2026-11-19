import { create } from "zustand";
import {
  CART_STORAGE_KEY,
  addItem,
  changeSize,
  readCart,
  reconcileCart,
  removeItem,
  setQuantity,
  writeCart
} from "@/lib/shop/cart-storage";
import type { CartItem, CartLineDTO } from "@/lib/types/cart";

interface CartState {
  /** Giỏ hiện tại, cùng thứ tự với localStorage `nike.cart`. */
  items: CartItem[];
  /** Thêm một đôi; `false` khi đã đủ `max` (không đổi giỏ). */
  add: (sizeId: number, max: number) => boolean;
  setQuantity: (sizeId: number, quantity: number) => void;
  remove: (sizeId: number) => void;
  changeSize: (fromId: number, toId: number, max: number) => void;
  /** Đối soát với kết quả `check` của giỏ hiện tại (§6.9). */
  reconcile: (lines: CartLineDTO[]) => void;
  /** Đọc lại localStorage (tab khác vừa sửa). */
  reload: () => void;
}

/**
 * Giỏ hàng của khách (plan gio-hang §4, §8 bước 5): lưu ở localStorage, không gắn tài khoản (§11 câu 7).
 * Mọi thay đổi ghi ngay xuống storage; sự kiện `storage` từ tab khác làm store đọc lại.
 */
export const useCart = create<CartState>()((set, get) => {
  const commit = (next: CartItem[]) => {
    if (next === get().items) return;
    writeCart(next);
    set({ items: next });
  };

  return {
    items: readCart(),
    add: (sizeId, max) => {
      const next = addItem(get().items, sizeId, max);
      if (!next) return false;
      commit(next);
      return true;
    },
    setQuantity: (sizeId, quantity) => commit(setQuantity(get().items, sizeId, quantity)),
    remove: (sizeId) => commit(removeItem(get().items, sizeId)),
    changeSize: (fromId, toId, max) => commit(changeSize(get().items, fromId, toId, max)),
    reconcile: (lines) => commit(reconcileCart(get().items, lines)),
    reload: () => set({ items: readCart() })
  };
});

// Tab khác sửa giỏ (A6) — `key === null` khi tab khác gọi `localStorage.clear()`
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === CART_STORAGE_KEY || e.key === null) useCart.getState().reload();
  });
}
