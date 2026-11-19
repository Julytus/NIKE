import { useSyncExternalStore } from "react";

/** Khớp media query, cập nhật khi đổi kích thước (đọc đồng bộ ngay lần render đầu). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}

/** "Desktop" của khu cửa hàng = ≥ 1024px (Tailwind `lg`, plan giao-dien-nike §6). */
export const useIsDesktop = () => useMediaQuery("(min-width: 1024px)");
