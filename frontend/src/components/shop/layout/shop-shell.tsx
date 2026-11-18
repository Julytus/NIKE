import "@fontsource/oswald/600.css";
import "@/components/shop/shop-theme.css";
import { useEffect } from "react";
import { ShopDialogs } from "@/components/shop/account/shop-dialogs";
import { ShopSessionSync } from "@/components/shop/account/shop-session-sync";
import { cn } from "@/lib/utils";
import { RouteProgress } from "./route-progress";

/**
 * Cửa hàng luôn giao diện sáng (Nike không có dark mode, plan giao-dien-nike §11 câu 7):
 * gỡ class `dark` khỏi `<html>` khi vào khu cửa hàng, trả lại khi rời đi (trang quản trị vẫn đổi được).
 */
function useForceLight() {
  useEffect(() => {
    const root = document.documentElement;
    // ThemeProvider (cha) chạy effect sau con và có thể gắn lại `dark` → canh bằng MutationObserver
    let wantsDark = false;
    const strip = () => {
      if (root.classList.contains("dark")) {
        wantsDark = true;
        root.classList.remove("dark");
      }
    };
    strip();
    const observer = new MutationObserver(strip);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => {
      observer.disconnect();
      if (wantsDark) root.classList.add("dark");
    };
  }, []);
}

/**
 * Phần chung của mọi trang cửa hàng: token màu (.shop), font, link "Bỏ qua menu",
 * thanh tiến trình chuyển trang và các hộp thoại tài khoản.
 */
export function ShopShell({ className, children }: { className?: string; children: React.ReactNode }) {
  useForceLight();

  return (
    <div className={cn("shop min-h-full shrink-0 bg-(--sh-bg) text-(--sh-fg)", className)}>
      <a
        href="#shop-main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("shop-main")?.focus();
        }}
        className="sr-only z-50 rounded-[30px] bg-(--sh-primary) px-5 py-2 font-medium text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Bỏ qua menu
      </a>
      <RouteProgress />
      {children}
      <ShopDialogs />
      <ShopSessionSync />
    </div>
  );
}
