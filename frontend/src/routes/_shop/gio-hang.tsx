import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonSection } from "@/components/shop/coming-soon-section";
/** Trang tạm giỏ hàng `/gio-hang` (plan giao-dien-nike §6.7); lát `gio-hang` thay nội dung. */
export const Route = createFileRoute("/_shop/gio-hang")({
  component: ComingSoonSection
});
