import { CatalogLink } from "@/components/shop/catalog-link";
import type { CatalogSearch } from "@/lib/shop/catalog-search";
import { useNavGroups } from "./nav-groups";

/** Bảng mega menu toàn chiều ngang dưới thanh chính: 3 cột link có gắn phạm vi của mục (§6.2). */
export function MegaMenuPanel({ scope, onNavigate }: { scope: CatalogSearch; onNavigate: () => void }) {
  const groups = useNavGroups(scope);

  return (
    <div
      data-testid="mega-menu"
      className="absolute inset-x-0 top-full z-10 border-t border-(--sh-border) bg-(--sh-bg) shadow-sm"
    >
      <div className="mx-auto flex max-w-[1000px] justify-center gap-24 px-12 pt-8 pb-12">
        {groups.map((group) => (
          <div key={group.title} className="flex min-w-36 flex-col gap-3">
            <p className="mb-1 text-base font-medium">{group.title}</p>
            <ul className="flex flex-col gap-2">
              {group.links.map((link) => (
                <li key={link.label}>
                  <CatalogLink
                    dest={link.target}
                    onClick={onNavigate}
                    className="rounded-sm text-sm font-medium text-(--sh-muted) outline-none hover:text-(--sh-fg) focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50"
                  >
                    {link.label}
                  </CatalogLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
