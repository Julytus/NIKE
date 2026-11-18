import { Outlet } from "@tanstack/react-router";
import { AnnouncementBar } from "@/components/shop/layout/announcement-bar";
import { ShopFooter } from "@/components/shop/layout/footer/shop-footer";
import { ShopHeader } from "@/components/shop/layout/header/shop-header";
import { ShopShell } from "./shop-shell";

/**
 * Khung trang cửa hàng (plan giao-dien-nike §8 bước 13): header → dải thông báo → `<main id="shop-main">`
 * (không padding chung, trang tự đặt lề) → footer. Không truyền `children` thì render `<Outlet />`.
 */
export function ShopLayout({ children }: { children?: React.ReactNode }) {
  return (
    <ShopShell className="flex flex-col">
      <ShopHeader />
      <AnnouncementBar />
      <main id="shop-main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        {children ?? <Outlet />}
      </main>
      <ShopFooter />
    </ShopShell>
  );
}
