import { Link } from "@tanstack/react-router";
import { useShopDialog } from "@/lib/stores/shop-dialog";
import { useShopSession } from "@/lib/stores/shop-session";

const UNDERLINE = "rounded-sm font-medium underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50";

/** Dải thông báo dưới header (ngoài `<header>`, cuộn mất bình thường) — plan giao-dien-nike §6.1. */
export function AnnouncementBar() {
  const user = useShopSession((s) => s.user);
  const loading = useShopSession((s) => s.loading);
  const openDialog = useShopDialog((s) => s.open);

  return (
    <div data-testid="announcement-bar" className="bg-(--sh-surface) px-4 py-3 text-center text-sm">
      <p>Miễn phí giao hàng cho đơn từ 5.000.000 ₫ &amp; đổi trả trong 30 ngày</p>
      <p className="mt-1 flex justify-center gap-3">
        {!user && !loading && (
          <button type="button" className={UNDERLINE} onClick={() => openDialog({ type: "register" })}>
            Tham gia ngay
          </button>
        )}
        <Link to="/thong-tin/$trang" params={{ trang: "giao-hang" }} className={UNDERLINE}>
          Xem chi tiết
        </Link>
      </p>
    </div>
  );
}
