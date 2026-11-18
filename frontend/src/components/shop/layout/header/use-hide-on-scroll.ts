import { useEffect, useLayoutEffect, useRef, useState } from "react";

const HIDE_AFTER = 96;
const SHOW_DELTA = 8;

/**
 * Header trượt ẩn khi cuộn `#app-scroll` xuống quá 96px, hiện lại khi cuộn lên ≥ 8px (plan giao-dien-nike §6.1).
 * `paused` (mega menu / tìm kiếm / menu trượt đang mở) được đọc ngay lúc có sự kiện cuộn, để cú cuộn
 * làm đóng mega menu không đồng thời làm ẩn header.
 */
export function useHideOnScroll(paused: boolean) {
  const [hidden, setHidden] = useState(false);
  const pausedRef = useRef(paused);

  useLayoutEffect(() => {
    pausedRef.current = paused;
    if (paused) setHidden(false);
  }, [paused]);

  useEffect(() => {
    const el = document.getElementById("app-scroll");
    if (!el) return;
    let last = el.scrollTop;
    let frame = 0;
    let skip = false;

    const onScroll = () => {
      if (pausedRef.current) skip = true;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = el.scrollTop;
        const delta = y - last;
        if (skip) {
          skip = false;
          last = y;
          return;
        }
        if (y <= 0) {
          last = y;
          setHidden(false);
        } else if (delta > 0) {
          last = y;
          if (y > HIDE_AFTER) setHidden(true);
        } else if (delta <= -SHOW_DELTA) {
          last = y;
          setHidden(false);
        }
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return hidden;
}
