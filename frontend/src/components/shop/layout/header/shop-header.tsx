import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { NikeSwoosh } from "@/components/brand/nike-swoosh";
import { cn } from "@/lib/utils";
import { HeaderActions } from "./header-actions";
import { MainNav } from "./main-nav";
import { MobileMenu } from "./mobile-menu";
import { SearchOverlay } from "./search-overlay";
import { TopBar } from "./top-bar";
import { useHideOnScroll } from "./use-hide-on-scroll";

/**
 * Header cửa hàng (plan giao-dien-nike §6.1): dải trên (desktop) + thanh chính 60px, dính đầu `#app-scroll`
 * với `top: -36px` ở desktop để dải trên cuộn mất còn thanh chính ở lại; trượt ẩn khi cuộn xuống.
 */
export function ShopHeader() {
  const [megaIndex, setMegaIndex] = useState<number | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const searchButton = useRef<HTMLButtonElement>(null);
  const hidden = useHideOnScroll(megaIndex !== null || searchOpen || menuOpen);

  // Đổi trang → đóng mega menu
  const href = useRouterState({ select: (s) => s.location.href });
  useEffect(() => setMegaIndex(null), [href]);

  return (
    <>
      <header
        data-hidden={hidden}
        className={cn(
          "sticky top-0 z-40 bg-(--sh-bg) transition-transform duration-200 motion-reduce:transition-none lg:-top-9",
          hidden && "-translate-y-full"
        )}
      >
        <div className="hidden lg:block">
          <TopBar />
        </div>
        <div className="flex h-15 items-center justify-between px-4 sm:px-6 lg:px-12">
          <div className="flex flex-1 items-center">
            <Link
              to="/"
              aria-label="Nike - về trang chủ"
              data-testid="header-logo"
              className="inline-flex h-12 items-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50"
            >
              <NikeSwoosh className="h-6 lg:h-7" />
            </Link>
          </div>
          <MainNav openIndex={megaIndex} onOpenChange={setMegaIndex} />
          <div className="flex flex-1 justify-end">
            <HeaderActions
              searchButtonRef={searchButton}
              onOpenSearch={() => setSearchOpen(true)}
              onOpenMenu={() => setMenuOpen(true)}
            />
          </div>
        </div>
      </header>
      <SearchOverlay open={searchOpen} onOpenChange={setSearchOpen} returnFocusRef={searchButton} />
      <MobileMenu open={menuOpen} onOpenChange={setMenuOpen} />
    </>
  );
}
