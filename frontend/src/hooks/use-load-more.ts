import { useEffect, useRef, useState } from "react";

/**
 * Tải thêm khi cuộn (plan danh-sach-giay §6.4): theo dõi phần tử canh (sentinel) sau thẻ cuối bằng
 * `IntersectionObserver` với root `#app-scroll` (vùng cuộn của app), `rootMargin` 600px.
 * Chỉ gọi `onLoadMore` khi `enabled` (còn trang, không đang tải, không lỗi).
 *
 * Observer được tạo lại mỗi khi `enabled` / `version` (vd số trang đã tải) đổi: lần `observe` đầu luôn
 * báo trạng thái hiện tại, nên sentinel vẫn nằm trong vùng 600px sau khi tải xong vẫn gọi tiếp được.
 * Trả về callback ref để gắn vào sentinel.
 */
export function useLoadMore({
  enabled,
  version,
  onLoadMore
}: {
  enabled: boolean;
  version: number;
  onLoadMore: () => void;
}) {
  const [sentinel, setSentinel] = useState<HTMLElement | null>(null);
  const onLoadMoreRef = useRef(onLoadMore);

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  });

  useEffect(() => {
    if (!sentinel || !enabled) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onLoadMoreRef.current();
      },
      { root: document.getElementById("app-scroll"), rootMargin: "600px 0px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinel, enabled, version]);

  return setSentinel;
}
