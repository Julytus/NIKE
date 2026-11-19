import { Link } from "@tanstack/react-router";
import { ShopButton } from "@/components/shop/ui/shop-button";

/**
 * Nội dung trang tạm cho `/w`, `/w/$danhMuc`, `/t/$slug`, `/yeu-thich`, `/gio-hang` (plan giao-dien-nike §6.7)
 * để link trong header không ra 404; lát sau ghi đè file route của mình.
 */
export function ComingSoonSection() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-[28px] font-medium">Sắp ra mắt</h1>
      <p className="text-base text-(--sh-muted)">Trang này đang được xây dựng.</p>
      <ShopButton asChild variant="primary" size="sm" className="mt-2">
        <Link to="/">Về trang chủ</Link>
      </ShopButton>
    </section>
  );
}
