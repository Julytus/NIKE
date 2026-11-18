import { Link } from "@tanstack/react-router";
import { ChevronDown, Globe } from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FOOTER_GROUPS, INFO_PAGES, LEGAL_LINKS, type InfoSlug } from "@/lib/shop/info-pages";

const LINK =
  "rounded-sm text-sm font-medium text-(--sh-muted) outline-none hover:text-(--sh-fg) focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50";

function InfoLinks({ slugs }: { slugs: InfoSlug[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {slugs.map((slug) => (
        <li key={slug}>
          <Link to="/thong-tin/$trang" params={{ trang: slug }} className={LINK}>
            {INFO_PAGES[slug].title}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Nhóm link dạng accordion trên điện thoại, mặc định đóng (§6.5). */
function MobileGroup({ title, slugs }: { title: string; slugs: InfoSlug[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-b border-(--sh-border)">
      <h2>
        <CollapsibleTrigger className="flex w-full items-center justify-between py-5 text-base font-medium outline-none focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50">
          {title}
          <ChevronDown aria-hidden className={`size-5 transition-transform ${open ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>
      </h2>
      <CollapsibleContent className="pb-5">
        <InfoLinks slugs={slugs} />
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Footer cửa hàng (plan giao-dien-nike §6.5): desktop 3 cột, mobile accordion. */
export function ShopFooter() {
  return (
    <footer className="mt-auto px-6 pb-8 lg:px-12">
      <div className="relative border-t border-(--sh-border) pt-10">
        <div className="hidden gap-8 lg:flex">
          <div className="flex gap-24">
            {FOOTER_GROUPS.map((group) => (
              <div key={group.title} className="flex min-w-40 flex-col gap-5">
                <h2 className="text-sm font-medium">{group.title}</h2>
                <InfoLinks slugs={group.links} />
              </div>
            ))}
          </div>
        </div>

        <div className="lg:hidden">
          {FOOTER_GROUPS.map((group) => (
            <MobileGroup key={group.title} title={group.title} slugs={group.links} />
          ))}
        </div>
        {/* Một phần tử cho cả hai màn hình: desktop ở góc phải trên, mobile dưới accordion */}
        <p className="mt-6 flex items-center gap-2 text-sm font-medium lg:absolute lg:top-10 lg:right-0 lg:mt-0">
          <Globe aria-hidden className="size-5" />
          <span>Việt Nam</span>
        </p>

        <div className="mt-10 flex flex-col gap-4 text-xs text-(--sh-muted) lg:flex-row lg:items-center lg:gap-8">
          <p>© 2026 Nike, Inc. Bảo lưu mọi quyền.</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {LEGAL_LINKS.map((slug) => (
              <li key={slug}>
                <Link
                  to="/thong-tin/$trang"
                  params={{ trang: slug }}
                  className="rounded-sm font-medium outline-none hover:text-(--sh-fg) focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50"
                >
                  {INFO_PAGES[slug].title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-4 text-xs text-(--sh-muted)">Dự án học tập mô phỏng nike.com, chạy local, không kinh doanh.</p>
      </div>
    </footer>
  );
}
