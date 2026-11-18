import { Link } from "@tanstack/react-router";
import type { CatalogTarget } from "@/lib/shop/catalog-search";

type CatalogLinkProps = Omit<React.ComponentProps<"a">, "href" | "ref" | "target"> & { dest: CatalogTarget };

/** Link có kiểu tới trang danh sách `/w` hoặc `/w/$danhMuc` (plan giao-dien-nike §6.2). */
export function CatalogLink({ dest, ...props }: CatalogLinkProps) {
  if (dest.to === "/w") return <Link to="/w" search={dest.search} {...props} />;
  return <Link to="/w/$danhMuc" params={{ danhMuc: dest.danhMuc }} search={dest.search} {...props} />;
}
