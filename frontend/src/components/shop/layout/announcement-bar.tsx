import { Link, useLocation } from "@tanstack/react-router";
import { signInSearch } from "@/lib/sign-in-redirect";
import { useShopSession } from "@/lib/stores/shop-session";

const UNDERLINE = "rounded-sm font-semibold underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50";

/** Dải thông báo dưới header (ngoài `<header>`, cuộn mất bình thường) — plan giao-dien-nike §6.1. */
export function AnnouncementBar() {
  const user = useShopSession((s) => s.user);
  const loading = useShopSession((s) => s.loading);
  const location = useLocation();

  return (
    <div data-testid="announcement-bar" className="bg-(--sh-surface) px-4 py-2 text-center text-base">
      <p>Free delivery on orders from 5.000.000 ₫ &amp; free 30-day returns</p>
      <p className="mt-0.5 flex justify-center gap-1.5 text-xs">
        {!user && !loading && (
          <Link to="/signin" search={signInSearch(location)} className={UNDERLINE}>
            Join Us
          </Link>
        )}
        <Link to="/info/$page" params={{ page: "delivery" }} className={UNDERLINE}>
          Learn More
        </Link>
      </p>
    </div>
  );
}
