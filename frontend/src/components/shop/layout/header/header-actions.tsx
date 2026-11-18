import { Link } from "@tanstack/react-router";
import { Heart, Menu, Search, ShoppingBag, UserRound } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsDesktop } from "@/hooks/use-media-query";
import { useShopDialog } from "@/lib/stores/shop-dialog";
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
        aria-label="Tìm kiếm"
        onClick={onOpenSearch}
        data-testid="header-search"
        className={`${ICON_BUTTON} lg:h-10 lg:w-[180px] lg:justify-start lg:gap-2 lg:bg-(--sh-surface) lg:pr-4 lg:pl-1.5`}
      >
        <span className="flex size-9 items-center justify-center rounded-full lg:hover:bg-(--sh-surface-hover)">
          <Search aria-hidden />
        </span>
        <span aria-hidden className="hidden text-base font-medium text-(--sh-muted) lg:inline">
          Tìm kiếm
        </span>
      </button>
      {isDesktop ? (
        <Link to="/yeu-thich" aria-label="Yêu thích" className={ICON_BUTTON}>
          <Heart aria-hidden />
        </Link>
      ) : (
        <MobileAccount />
      )}
      <Link to="/gio-hang" aria-label="Giỏ hàng" data-testid="header-cart" className={ICON_BUTTON}>
        <ShoppingBag aria-hidden />
      </Link>
      {!isDesktop && (
        <button type="button" aria-label="Menu" onClick={onOpenMenu} data-testid="header-menu" className={ICON_BUTTON}>
          <Menu aria-hidden />
        </button>
      )}
    </div>
  );
}

/** Icon tài khoản (mobile): chưa đăng nhập → "Đăng nhập"; đã đăng nhập → menu "Xin chào, <tên>". */
function MobileAccount() {
  const user = useShopSession((s) => s.user);
  const loading = useShopSession((s) => s.loading);
  const openDialog = useShopDialog((s) => s.open);

  if (loading && !user) {
    return <Skeleton role="status" aria-label="Đang tải tài khoản" className="size-8 rounded-full bg-(--sh-surface)" />;
  }
  if (user) return <AccountMenu user={user} variant="icon" />;
  return (
    <button type="button" aria-label="Đăng nhập" onClick={() => openDialog({ type: "login" })} className={ICON_BUTTON}>
      <UserRound aria-hidden />
    </button>
  );
}
