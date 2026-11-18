import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonSection } from "@/components/shop/coming-soon-section";
/** Trang tạm chi tiết giày `/t/$slug` (plan giao-dien-nike §6.7); lát `chi-tiet-giay` thay nội dung. */
export const Route = createFileRoute("/_shop/t/$slug")({
  component: ComingSoonSection
});
