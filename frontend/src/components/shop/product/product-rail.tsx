import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const EDGE = 4;

/**
 * Dải thẻ cuộn ngang (plan giao-dien-nike §6.6): cuộn native + scroll-snap, nút ‹ › cuộn 80% bề rộng,
 * nút bị khoá khi ở đầu / cuối (sai số 4px). Tiêu đề + phần bên phải (vd "Xem tất cả") truyền vào.
 */
export function ProductRail({
  title,
  headingId,
  aside,
  children
}: {
  title: string;
  headingId: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  const rail = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: true });

  const update = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    setEdges({
      atStart: el.scrollLeft <= EDGE,
      atEnd: el.scrollLeft + el.clientWidth >= el.scrollWidth - EDGE
    });
  }, []);

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, [update]);

  const scroll = (dir: 1 | -1) => {
    const el = rail.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: reduce ? "auto" : "smooth" });
  };

  const navButton = "flex size-12 items-center justify-center rounded-full bg-(--sh-surface) transition-colors hover:bg-(--sh-surface-hover) disabled:cursor-default disabled:opacity-40 disabled:hover:bg-(--sh-surface) outline-none focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50 [&_svg]:size-6";

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 id={headingId} className="text-2xl font-medium">
          {title}
        </h2>
        <div className="flex items-center gap-3">
          {aside}
          <div className="hidden gap-3 lg:flex">
            <button
              type="button"
              aria-label="Xem sản phẩm trước"
              disabled={edges.atStart}
              onClick={() => scroll(-1)}
              className={navButton}
            >
              <ChevronLeft aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Xem sản phẩm tiếp theo"
              disabled={edges.atEnd}
              onClick={() => scroll(1)}
              className={navButton}
            >
              <ChevronRight aria-hidden />
            </button>
          </div>
        </div>
      </div>
      <ul
        ref={rail}
        aria-labelledby={headingId}
        className={cn(
          "shop-rail flex snap-x snap-mandatory gap-3 overflow-x-auto pb-6",
          "[&>li]:shrink-0 [&>li]:basis-[66%] [&>li]:snap-start sm:[&>li]:basis-[45%] lg:[&>li]:basis-[31.5%]"
        )}
      >
        {children}
      </ul>
    </>
  );
}
