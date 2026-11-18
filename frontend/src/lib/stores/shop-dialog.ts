import { create } from "zustand";

/**
 * Hộp thoại tài khoản dùng chung của cửa hàng, render một lần ở `ShopDialogs`.
 * `email` điền sẵn khi chuyển từ đăng ký sang đăng nhập (email đã có tài khoản).
 */
export type ShopDialog = { type: "login"; email?: string } | { type: "register" };

interface ShopDialogState {
  dialog: ShopDialog | null;
  open: (dialog: ShopDialog) => void;
  close: () => void;
}

export const useShopDialog = create<ShopDialogState>()((set) => ({
  dialog: null,
  open: (dialog) => set({ dialog }),
  close: () => set({ dialog: null })
}));
