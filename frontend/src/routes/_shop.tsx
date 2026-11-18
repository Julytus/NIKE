import { createFileRoute } from "@tanstack/react-router";
import { NotFoundPage } from "@/components/not-found-page";
import { ShopLayout } from "@/components/shop/layout/shop-layout";

/** Layout khu cửa hàng (plan giao-dien-nike §8 bước 17): header + dải thông báo + nội dung + footer. */
export const Route = createFileRoute("/_shop")({
  component: () => <ShopLayout />,
  notFoundComponent: () => <NotFoundPage embedded home="/" />
});
