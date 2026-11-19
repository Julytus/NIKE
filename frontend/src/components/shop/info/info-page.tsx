import { Link } from "@tanstack/react-router";
import { INFO_PAGES, type InfoSlug } from "@/lib/shop/info-pages";

/** Trang thông tin tĩnh: khối giữa ≤ 720px, h1 28px, đoạn 16px line-height 1.75 (plan giao-dien-nike §6.5). */
export function InfoPage({ slug }: { slug: InfoSlug }) {
  const page = INFO_PAGES[slug];
  const links = ("links" in page ? page.links : []) as InfoSlug[];

  return (
    <article className="mx-auto w-full max-w-[720px] px-6 py-12 lg:py-16">
      <h1 className="mb-6 text-[28px] leading-tight font-medium">{page.title}</h1>
      {page.paragraphs.map((p) => (
        <p key={p} className="mb-4 text-base leading-[1.75]">
          {p}
        </p>
      ))}
      {links.length > 0 && (
        <ul className="flex flex-col gap-2">
          {links.map((s) => (
            <li key={s}>
              <Link
                to="/info/$page"
                params={{ page: s }}
                className="rounded-sm text-base font-medium underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50"
              >
                {INFO_PAGES[s].title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
