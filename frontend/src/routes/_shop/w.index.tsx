import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonSection } from "@/components/shop/coming-soon-section";
import { catalogSearchSchema } from "@/lib/shop/catalog-search";
/** Trang tạm danh sách giày `/w` (plan giao-dien-nike §6.7); lát `danh-sach-giay` thay nội dung. */
export const Route = createFileRoute("/_shop/w/")({
  validateSearch: catalogSearchSchema,
  component: ComingSoonSection
});
