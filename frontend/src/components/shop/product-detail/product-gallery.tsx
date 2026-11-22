import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { GALLERY_EDGE } from "@/lib/shop/product-detail";
import type { ProductImageDTO } from "@/lib/types/product";
import { cn } from "@/lib/utils";

/** Điều khiển dải ảnh từ ngoài: bấm ảnh nhỏ (plan chi-tiet-giay §6.4 mục 4). */
export interface ProductGalleryHandle {
  /** Cuộn tới ảnh `index` (0-based); `instant` = không hiệu ứng. */
  scrollToImage: (index: number, instant?: boolean) => void;
}

/** Kéo quá phần này của bề rộng một ảnh thì thả ra sang hẳn ảnh kế theo hướng kéo (§6.2). */
const DRAG_THRESHOLD = 0.15;

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Dải ảnh cuộn ngang native + scroll-snap (§6.2). Desktop: mỗi ảnh rộng 2/3 khung (thấy ~1,5 ảnh), nút ‹ ›
 * góc dưới phải, thanh vị trí góc dưới trái, giữ chuột kéo sang bên để đổi ảnh. Mobile: 1 ảnh / màn (vuốt
 * native), thanh vị trí dưới gallery. "Ảnh hiện tại" tính từ `scrollLeft`, báo ra ngoài qua `onCurrentChange`.
 * Không có phóng to ảnh (bỏ theo yêu cầu người dùng, plan §6.3).
 */
export function ProductGallery({
  ref,
  name,
  images,
  current,
  desktop,
  onCurrentChange
}: {
  ref?: Ref<ProductGalleryHandle>;
  name: string;
  images: ProductImageDTO[];
  current: number;
  desktop: boolean;
  onCurrentChange: (index: number) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  /** Lúc bắt đầu kéo: vị trí chuột, `scrollLeft`, ảnh hiện tại. */
  const drag = useRef<{ x: number; left: number; index: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const count = images.length;

  /** Khoảng cách giữa hai ảnh liền nhau (bề rộng ảnh + khe). */
  const stride = useCallback(() => {
    const el = track.current;
    const [a, b] = el ? Array.from(el.children as HTMLCollectionOf<HTMLElement>) : [];
    if (!a) return 1;
    return b ? b.offsetLeft - a.offsetLeft : a.offsetWidth;
  }, []);

  const computeCurrent = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const index =
      max > GALLERY_EDGE && el.scrollLeft >= max - GALLERY_EDGE
        ? count - 1
        : Math.min(count - 1, Math.round(el.scrollLeft / stride()));
    onCurrentChange(index);
  }, [count, onCurrentChange, stride]);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    el.addEventListener("scroll", computeCurrent, { passive: true });
    const observer = new ResizeObserver(computeCurrent);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", computeCurrent);
      observer.disconnect();
    };
  }, [computeCurrent]);

  const scrollToImage = useCallback(
    (index: number, instant = false) => {
      track.current?.scrollTo({
        left: index * stride(),
        behavior: instant || prefersReducedMotion() ? "instant" : "smooth"
      });
    },
    [stride]
  );

  useImperativeHandle(ref, () => ({ scrollToImage }), [scrollToImage]);

  // Kéo bằng chuột (desktop; cảm ứng dùng vuốt native): dải trượt theo tay, tắt snap khi đang kéo
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = track.current;
    if (!desktop || !el || e.pointerType !== "mouse" || e.button !== 0) return;
    drag.current = { x: e.clientX, left: el.scrollLeft, index: current };
    el.setPointerCapture(e.pointerId);
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = track.current;
    if (!drag.current || !el) return;
    el.scrollLeft = drag.current.left - (e.clientX - drag.current.x);
  };

  /** Thả: kéo ít (≤ 15% một ảnh) → về ảnh cũ; kéo nhiều hơn → ảnh gần nhất, tối thiểu sang ảnh kế theo hướng kéo. */
  const endDrag = () => {
    const el = track.current;
    const start = drag.current;
    drag.current = null;
    setDragging(false);
    if (!el || !start) return;
    const step = stride();
    const moved = el.scrollLeft - start.left;
    let target = start.index;
    if (Math.abs(moved) > step * DRAG_THRESHOLD) {
      const nearest = Math.round(el.scrollLeft / step);
      target = moved > 0 ? Math.max(nearest, start.index + 1) : Math.min(nearest, start.index - 1);
    }
    scrollToImage(Math.max(0, Math.min(count - 1, target)));
  };

  const navButton =
    "flex size-9 items-center justify-center rounded-full bg-white text-(--sh-fg) transition-colors hover:bg-(--sh-surface-hover) disabled:cursor-default disabled:opacity-50 disabled:hover:bg-white outline-none focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50 [&_svg]:size-5";

  const indicator = (
    <div aria-hidden className="flex items-center gap-1">
      {images.map((img, i) => (
        <span
          key={img.id}
          className={cn(
            "h-0.5 rounded-full transition-all",
            i === current ? "w-5 bg-(--sh-fg)" : "w-1.5 bg-(--sh-disabled)"
          )}
        />
      ))}
    </div>
  );

  return (
    <section data-testid="pdp-gallery" className="flex min-w-0 flex-col">
      <div
        className={cn(
          "relative bg-(--sh-surface)",
          desktop ? "h-[calc(100vh-60px)] min-h-[480px]" : "aspect-square w-full"
        )}
      >
        <div
          ref={track}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          // Vùng cuộn phải focus được bằng bàn phím (WCAG 2.1.1, axe scrollable-region-focusable):
          // focus rồi ←/→ là trình duyệt tự cuộn. Tên vùng đặt ở đây thay cho <section> bao ngoài.
          tabIndex={0}
          role="region"
          aria-label="Product images"
          className={cn(
            "pdp-gallery-track flex size-full overflow-x-auto overscroll-x-contain outline-none focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50 focus-visible:ring-inset",
            dragging ? "cursor-grabbing snap-none select-none" : "snap-x snap-mandatory",
            desktop && "gap-1",
            desktop && !dragging && "cursor-grab"
          )}
        >
          {images.map((img, i) => (
            <div
              key={img.id}
              data-testid="pdp-gallery-image"
              className={cn("h-full shrink-0 snap-start", desktop ? "basis-2/3" : "basis-full")}
            >
              <img
                src={img.url}
                alt={`${name}, image ${i + 1} of ${count}`}
                loading={i < 2 ? "eager" : "lazy"}
                draggable={false}
                className="pointer-events-none size-full object-cover select-none"
              />
            </div>
          ))}
        </div>

        {desktop && (
          <>
            <div className="pointer-events-none absolute bottom-6 left-6">{indicator}</div>
            <div className="absolute right-6 bottom-6 flex gap-3">
              <button
                type="button"
                data-testid="pdp-gallery-prev"
                aria-label="Previous image"
                disabled={current <= 0}
                onClick={() => scrollToImage(current - 1)}
                className={navButton}
              >
                <ChevronLeft aria-hidden />
              </button>
              <button
                type="button"
                data-testid="pdp-gallery-next"
                aria-label="Next image"
                disabled={current >= count - 1}
                onClick={() => scrollToImage(current + 1)}
                className={navButton}
              >
                <ChevronRight aria-hidden />
              </button>
            </div>
          </>
        )}
      </div>
      {!desktop && <div className="flex justify-center py-3">{indicator}</div>}
    </section>
  );
}
