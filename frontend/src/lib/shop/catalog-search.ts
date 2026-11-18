import { z } from "zod";

/**
 * Hợp đồng URL trang danh sách `/w`, `/w/$danhMuc` (plan giao-dien-nike §6.2) — lát `danh-sach-giay` phải theo.
 * Mọi khoá tuỳ chọn; giá trị sai bị bỏ (`.catch(undefined)`) để URL gõ tay không làm vỡ trang.
 */
const csvOf = (allowed: readonly string[]) =>
  z
    .string()
    .refine((v) => v.split(",").every((x) => allowed.includes(x)))
    .optional()
    .catch(undefined);

export const PRICE_RANGES = [
  { value: "duoi-1tr", label: "Dưới 1.000.000 ₫" },
  { value: "1-2tr", label: "1.000.000 ₫ – 2.000.000 ₫" },
  { value: "2-5tr", label: "2.000.001 ₫ – 4.999.999 ₫" },
  { value: "tu-5tr", label: "Từ 5.000.000 ₫" }
] as const;

export type PriceRange = (typeof PRICE_RANGES)[number]["value"];

export const catalogSearchSchema = z.object({
  gioiTinh: csvOf(["nam", "nu", "unisex"]),
  treEm: csvOf(["be-trai", "be-gai"]),
  gia: z.enum(["duoi-1tr", "1-2tr", "2-5tr", "tu-5tr"]).optional().catch(undefined),
  /** Số `1` để TanStack Router ghi `giamGia=1` (chuỗi "1" sẽ bị bọc ngoặc kép) */
  giamGia: z.literal(1).optional().catch(undefined),
  nhan: z.enum(["moi-ve", "ban-chay"]).optional().catch(undefined),
  sapXep: z.enum(["noi-bat", "moi-nhat", "gia-giam", "gia-tang"]).optional().catch(undefined),
  q: z.string().optional().catch(undefined)
});

export type CatalogSearch = z.infer<typeof catalogSearchSchema>;

/** Đích của một link vào trang danh sách: `/w` hoặc `/w/<slug danh mục>`, kèm tham số. */
export type CatalogTarget = { to: "/w"; search: CatalogSearch } | { to: "/w/$danhMuc"; danhMuc: string; search: CatalogSearch };

/** 5 mục menu chính: `search` = khi bấm chữ của mục, `scope` = gắn vào mọi link trong mega menu của mục (§6.1). */
export const NAV_ITEMS: { label: string; search: CatalogSearch; scope: CatalogSearch }[] = [
  { label: "Mới & Nổi bật", search: { sapXep: "moi-nhat" }, scope: {} },
  { label: "Nam", search: { gioiTinh: "nam" }, scope: { gioiTinh: "nam" } },
  { label: "Nữ", search: { gioiTinh: "nu" }, scope: { gioiTinh: "nu" } },
  { label: "Trẻ em", search: { treEm: "be-trai,be-gai" }, scope: { treEm: "be-trai,be-gai" } },
  { label: "Giảm giá", search: { giamGia: 1 }, scope: { giamGia: 1 } }
];

/** Cột "Nổi bật" của mega menu (đường dẫn gốc là `/w` + tham số). */
export const FEATURED_LINKS: { label: string; search: CatalogSearch }[] = [
  { label: "Tất cả giày", search: {} },
  { label: "Mới về", search: { nhan: "moi-ve" } },
  { label: "Bán chạy", search: { nhan: "ban-chay" } },
  { label: "Giảm giá", search: { giamGia: 1 } }
];

/** Gắn tham số phạm vi của mục menu vào một link (`/w?...` hoặc `/w/<slug>?...`). */
export function withScope(
  base: { danhMuc?: string; search?: CatalogSearch },
  scope: CatalogSearch
): CatalogTarget {
  const search = { ...scope, ...base.search };
  return base.danhMuc ? { to: "/w/$danhMuc", danhMuc: base.danhMuc, search } : { to: "/w", search };
}
