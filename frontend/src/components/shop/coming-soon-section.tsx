import { Link } from "@tanstack/react-router";
import { ShopButton } from "@/components/shop/ui/shop-button";

/**
 * Nội dung trang tạm cho `/t/$slug`, `/favorites`, `/cart` (plan tieng-anh-cua-hang §6.7)
 * để link trong header không ra 404; lát sau ghi đè file route của mình.
 */
export function ComingSoonSection() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-[28px] font-medium">Coming Soon</h1>
      <p className="text-base text-(--sh-muted)">This page is under construction.</p>
      <ShopButton asChild variant="primary" size="sm" className="mt-2">
        <Link to="/">Back to Home</Link>
      </ShopButton>
    </section>
  );
}
