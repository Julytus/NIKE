import { createFileRoute, notFound } from "@tanstack/react-router";
import { NotFoundPage } from "@/components/not-found-page";
import { InfoPage } from "@/components/shop/info/info-page";
import { INFO_PAGES, isInfoSlug } from "@/lib/shop/info-pages";

/** 15 trang thông tin tĩnh; slug lạ → 404 chung (plan giao-dien-nike §6.5, E5). */
export const Route = createFileRoute("/_shop/thong-tin/$trang")({
  beforeLoad: ({ params }) => {
    if (!isInfoSlug(params.trang)) throw notFound();
  },
  head: ({ params }) => ({
    meta: [{ title: isInfoSlug(params.trang) ? `${INFO_PAGES[params.trang].title} | Nike` : "Nike" }]
  }),
  component: InfoRoute,
  notFoundComponent: () => <NotFoundPage embedded home="/" />
});

function InfoRoute() {
  const { trang } = Route.useParams();
  return isInfoSlug(trang) ? <InfoPage slug={trang} /> : null;
}
