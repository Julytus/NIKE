import { Link } from "@tanstack/react-router";
import { NikeSwoosh } from "@/components/admin/nike-swoosh";
import { HeaderActions } from "./header-actions";

/** Header tối giản của trang tạm (plan go-lut §6.1); lát `giao-dien-nike` thay bằng header Nike đầy đủ. */
export function ShopHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-(--sh-border) bg-(--sh-bg) px-4 md:px-12">
      <Link
        to="/"
        aria-label="Nike - về trang chủ"
        data-testid="header-logo"
        className="inline-flex h-12 items-center rounded-[8px] outline-none focus-visible:ring-2 focus-visible:ring-(--sh-fg)/40"
      >
        <NikeSwoosh className="h-5" />
      </Link>
      <div className="ml-auto">
        <HeaderActions />
      </div>
    </header>
  );
}
