import { Link, useLocation } from "@tanstack/react-router";
import { Heart, Menu, Search, ShoppingBag, UserRound } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsDesktop } from "@/hooks/use-media-query";
import { cartCount } from "@/lib/shop/cart-storage";
import { useCart } from "@/lib/stores/cart";
import { signInSearch } from "@/lib/sign-in-redirect";
import { useShopSession } from "@/lib/stores/shop-session";
import { AccountMenu } from "./account-menu";

const ICON_BUTTON =
  "flex size-10 items-center justify-center rounded-full outline-none hover:bg-(--sh-surface-hover) focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50 [&_svg]:size-6";

/**
 * Cụm bên phải thanh chính (plan giao-dien-nike §6.1).
 * Desktop: ô "Tìm kiếm" + Yêu thích + Giỏ hàng. Mobile: icon Tìm kiếm, tài khoản, Giỏ hàng, Menu.
 * Phần chỉ có ở một loại màn hình render theo `useIsDesktop` để không có hai nút trùng tên / testid.
 */
export function HeaderActions({
  searchButtonRef,
  onOpenSearch,
  onOpenMenu
}: {
  searchButtonRef: React.Ref<HTMLButtonElement>;
  onOpenSearch: () => void;
  onOpenMenu: () => void;
}) {
  const isDesktop = useIsDesktop();

  return (
    <div className="flex items-center gap-1 lg:gap-3">
      {/* Một nút cho cả hai màn hình: desktop là ô bo tròn có chữ, mobile là icon */}
      <button
        ref={searchButtonRef}
        type="button"
        aria-label="Search"
        onClick={onOpenSearch}
        data-testid="header-search"
        className={`${ICON_BUTTON} lg:h-10 lg:w-[180px] lg:justify-start lg:gap-2 lg:bg-(--sh-surface) lg:pr-4 lg:pl-1.5`}
      >
        <span className="flex size-9 items-center justify-center rounded-full lg:hover:bg-(--sh-surface-hover)">
          <Search aria-hidden />
        </span>
        <span aria-hidden className="hidden text-base font-medium text-(--sh-muted) lg:inline">
          Search
        </span>
      </button>
      {isDesktop ? (
        <Link to="/favorites" aria-label="Favourites" className={ICON_BUTTON}>
          <Heart aria-hidden />
        </Link>
      ) : (
        <MobileAccount />
      )}
      <CartLink />
      {!isDesktop && (
        <button type="button" aria-label="Menu" onClick={onOpenMenu} data-testid="header-menu" className={ICON_BUTTON}>
          <Menu aria-hidden />
        </button>
      )}
    </div>
  );
}

/**
 * Icon túi + số món trong giỏ (plan gio-hang §6.1): số nằm giữa icon (9px / 500), `aria-hidden` vì tên link đã
 * có số ("Bag, 2 items"); giỏ trống → tên "Bag", không có số; quá 99 → hiện "99+" (tên vẫn số thật).
 */
function CartLink() {
  const count = useCart((s) => cartCount(s.items));
  const label = count > 0 ? `Bag, ${count} ${count === 1 ? "item" : "items"}` : "Bag";
  return (
    <Link to="/cart" aria-label={label} data-testid="header-cart" className={`${ICON_BUTTON} relative`}>
      <ShoppingBag aria-hidden />
      {count > 0 && (
        <span
          data-testid="header-cart-count"
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-[17px] text-center text-[9px] leading-none font-medium"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

/** Icon tài khoản (mobile): chưa đăng nhập → link "Sign In" tới `/signin`; đã đăng nhập → menu "Hi, <tên>". */
function MobileAccount() {
  const user = useShopSession((s) => s.user);
  const loading = useShopSession((s) => s.loading);
  const location = useLocation();

  if (loading && !user) {
    return <Skeleton role="status" aria-label="Loading account" className="size-8 rounded-full bg-(--sh-surface)" />;
  }
  if (user) return <AccountMenu user={user} variant="icon" />;
  return (
    <Link to="/signin" search={signInSearch(location)} aria-label="Sign In" className={ICON_BUTTON}>
      <UserRound aria-hidden />
    </Link>
  );
}
