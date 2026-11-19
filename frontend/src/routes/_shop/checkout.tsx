import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonSection } from "@/components/shop/coming-soon-section";

/** Trang tạm `/checkout` (plan gio-hang §6.8, §11 câu 1); lát `dat-hang` ghi đè bằng trang thanh toán thật. */
export const Route = createFileRoute("/_shop/checkout")({
  head: () => ({ meta: [{ title: "Checkout | Nike" }] }),
  component: ComingSoonSection
});
