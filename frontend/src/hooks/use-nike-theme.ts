import { useEffect } from "react";

/**
 * Bật bộ màu / font kiểu Nike (`.nike-admin` trong index.css) cho trang quản trị và đăng nhập.
 * Gắn lên <html> để cả dialog, dropdown, toast (render qua portal ra ngoài layout) cũng nhận.
 */
export function useNikeTheme() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("nike-admin");
    return () => root.classList.remove("nike-admin");
  }, []);
}
