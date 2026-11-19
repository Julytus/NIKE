import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { NAV_ITEMS } from "@/lib/shop/catalog-search";
import { cn } from "@/lib/utils";
import { MegaMenuPanel } from "./mega-menu-panel";

const OPEN_DELAY = 150;

/**
 * Menu chính desktop + mega menu (plan giao-dien-nike §6.2). Tự làm bằng pointer / focus thay cho
 * `NavigationMenu` của Radix vì mục phải là link điều hướng được (trigger của Radix là nút bật / tắt).
 * Rê chuột vào mục ≥ 150ms → mở; rời mục + bảng, Esc, cuộn trang hoặc bấm link → đóng.
 */
export function MainNav({
  openIndex,
  onOpenChange
}: {
  openIndex: number | null;
  onOpenChange: (i: number | null) => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wrapper = useRef<HTMLDivElement>(null);
  const isOpen = openIndex !== null;

  const close = () => {
    clearTimeout(timer.current);
    onOpenChange(null);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(null);
    };
    const scroller = document.getElementById("app-scroll");
    const onScroll = () => onOpenChange(null);
    document.addEventListener("keydown", onKey);
    scroller?.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      scroller?.removeEventListener("scroll", onScroll);
    };
  }, [isOpen, onOpenChange]);

  const openLater = (i: number) => {
    clearTimeout(timer.current);
    if (isOpen) onOpenChange(i);
    else timer.current = setTimeout(() => onOpenChange(i), OPEN_DELAY);
  };

  return (
    <div
      ref={wrapper}
      className="hidden h-full lg:flex"
      onPointerLeave={close}
      onBlur={(e) => {
        if (!wrapper.current?.contains(e.relatedTarget as Node | null)) close();
      }}
    >
      <nav aria-label="Danh mục chính" className="h-full">
        <ul className="flex h-full items-center">
          {NAV_ITEMS.map((item, i) => (
            <li key={item.label} className="h-full">
              <Link
                to="/w"
                search={item.search}
                onPointerEnter={() => openLater(i)}
                onFocus={() => {
                  clearTimeout(timer.current);
                  onOpenChange(i);
                }}
                onClick={close}
                className="group flex h-full items-center px-3 text-base font-medium outline-none"
              >
                <span
                  className={cn(
                    "border-b-2 border-transparent py-1 group-hover:border-(--sh-fg) group-focus-visible:border-(--sh-fg)",
                    openIndex === i && "border-(--sh-fg)"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {isOpen && (
        <>
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-full h-screen bg-black/20" />
          <MegaMenuPanel scope={NAV_ITEMS[openIndex]!.scope} onNavigate={close} />
        </>
      )}
    </div>
  );
}
