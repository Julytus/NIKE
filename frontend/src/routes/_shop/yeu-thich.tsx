import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonSection } from "@/components/shop/coming-soon-section";
/** Trang tạm yêu thích `/yeu-thich` (plan giao-dien-nike §6.7); lát `yeu-thich` thay nội dung. */
export const Route = createFileRoute("/_shop/yeu-thich")({
  component: ComingSoonSection
});
