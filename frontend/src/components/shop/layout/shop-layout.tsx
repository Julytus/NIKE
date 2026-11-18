import { Outlet } from "@tanstack/react-router";
import { ShopFooter } from "@/components/shop/layout/footer/shop-footer";
import { ShopHeader } from "@/components/shop/layout/header/shop-header";
import { ShopShell } from "./shop-shell";

/** Khung trang cửa hàng: header + nội dung + footer. Không truyền `children` thì render `<Outlet />`. */
export function ShopLayout({ children }: { children?: React.ReactNode }) {
  return (
    <ShopShell className="flex flex-col">
      <ShopHeader />
      <main id="shop-main" className="flex flex-1 flex-col px-4 pt-5 pb-16 md:px-12">
        {children ?? <Outlet />}
      </main>
      <ShopFooter />
    </ShopShell>
  );
}
