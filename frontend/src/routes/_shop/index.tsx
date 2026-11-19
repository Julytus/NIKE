import { createFileRoute } from "@tanstack/react-router";
import { CategorySection } from "@/components/shop/home/category-section";
import { HomeHero } from "@/components/shop/home/home-hero";
import { JordanFeature } from "@/components/shop/home/jordan-feature";
import { NewArrivalsSection } from "@/components/shop/home/new-arrivals-section";

/** Trang chủ cửa hàng (plan giao-dien-nike §6.6). */
export const Route = createFileRoute("/_shop/")({
  head: () => ({
    meta: [{ title: "Nike. Just Do It." }]
  }),
  component: HomePage
});

function HomePage() {
  return (
    <div className="flex flex-col gap-12 px-6 pt-6 pb-16 lg:gap-[84px] lg:px-12">
      <HomeHero />
      <NewArrivalsSection />
      <JordanFeature />
      <CategorySection />
    </div>
  );
}
