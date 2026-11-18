import { useQuery } from "@tanstack/react-query";
import {
  FEATURED_LINKS,
  PRICE_RANGES,
  withScope,
  type CatalogSearch,
  type CatalogTarget
} from "@/lib/shop/catalog-search";
import { productCategoriesQueryOptions } from "@/lib/tanstack/options/product";

export interface NavGroup {
  title: string;
  links: { label: string; target: CatalogTarget }[];
}

/**
 * 3 nhóm link của một mục menu ("Danh mục", "Nổi bật", "Theo giá"), mọi link gắn `scope` của mục
 * (plan giao-dien-nike §6.2). Dùng chung cho mega menu (desktop) và panel con của menu trượt (mobile).
 * Danh mục đang tải / lỗi → không có nhóm "Danh mục".
 */
export function useNavGroups(scope: CatalogSearch): NavGroup[] {
  const { data: categories } = useQuery(productCategoriesQueryOptions);

  const groups: NavGroup[] = [
    {
      title: "Nổi bật",
      links: FEATURED_LINKS.map((l) => ({ label: l.label, target: withScope({ search: l.search }, scope) }))
    },
    {
      title: "Theo giá",
      links: PRICE_RANGES.map((p) => ({ label: p.label, target: withScope({ search: { gia: p.value } }, scope) }))
    }
  ];
  if (categories) {
    groups.unshift({
      title: "Danh mục",
      links: categories.map((c) => ({ label: c.name, target: withScope({ danhMuc: c.slug }, scope) }))
    });
  }
  return groups;
}
