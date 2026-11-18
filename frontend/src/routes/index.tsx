import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonPage } from "@/components/shop/coming-soon-page";
import { ShopLayout } from "@/components/shop/layout/shop-layout";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "Nike. Just Do It." }]
  }),
  component: () => (
    <ShopLayout>
      <ComingSoonPage />
    </ShopLayout>
  )
});
