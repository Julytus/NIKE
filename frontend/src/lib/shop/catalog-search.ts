import { z } from "zod";
import type { ProductFilterParams, ProductListParams } from "@/lib/types/product";

/**
 * Hợp đồng URL trang danh sách `/w`, `/w/$category` (plan tieng-anh-cua-hang §6.2, mở rộng ở plan danh-sach-giay §6.1).
 * Mọi khoá tuỳ chọn; giá trị sai bị bỏ (`.catch(undefined)`) để URL gõ tay không làm vỡ trang.
 * `gender`, `kids`, `price`, `badge`, `size` nhận nhiều giá trị ngăn dấu phẩy.
 */
const csvOf = (allowed: readonly string[]) =>
  z
    .string()
    .refine((v) => v.split(",").every((x) => allowed.includes(x)))
    .optional()
    .catch(undefined);

/** Một size EU trên URL: `42`, `40.5` */
const SIZE_PART = /^\d{2}(\.5)?$/;

export const PRICE_RANGES = [
  { value: "under-1m", label: "Under 1.000.000 ₫" },
  { value: "1m-2m", label: "1.000.000 ₫ – 2.000.000 ₫" },
  { value: "2m-5m", label: "2.000.001 ₫ – 4.999.999 ₫" },
  { value: "5m-plus", label: "5.000.000 ₫ & Above" }
] as const;

export type PriceRange = (typeof PRICE_RANGES)[number]["value"];

export const catalogSearchSchema = z.object({
  gender: csvOf(["men", "women", "unisex"]),
  kids: csvOf(["boys", "girls"]),
  price: csvOf(PRICE_RANGES.map((p) => p.value)),
  /** Số `1` để TanStack Router ghi `sale=1` (chuỗi "1" sẽ bị bọc ngoặc kép) */
  sale: z.literal(1).optional().catch(undefined),
  badge: csvOf(["just-in", "bestseller"]),
  /**
   * Số EU: router đọc `size=42` thành số 42, `size=40.5,42` thành chuỗi → nhận cả hai.
   * Mỗi phần khớp `^\d{2}(\.5)?$`; sai một phần thì bỏ cả khoá.
   */
  size: z
    .union([z.number(), z.string()])
    .refine((v) =>
      String(v)
        .split(",")
        .every((x) => SIZE_PART.test(x))
    )
    .optional()
    .catch(undefined),
  sort: z.enum(["featured", "newest", "price-desc", "price-asc"]).optional().catch(undefined),
  q: z.string().optional().catch(undefined)
});

export type CatalogSearch = z.infer<typeof catalogSearchSchema>;

/** Đích của một link vào trang danh sách: `/w` hoặc `/w/<slug danh mục>`, kèm tham số. */
export type CatalogTarget =
  | { to: "/w"; search: CatalogSearch }
  | { to: "/w/$category"; category: string; search: CatalogSearch };

/** 5 mục menu chính: `search` = khi bấm chữ của mục, `scope` = gắn vào mọi link trong mega menu của mục (§6.1). */
export const NAV_ITEMS: { label: string; search: CatalogSearch; scope: CatalogSearch }[] = [
  { label: "New & Featured", search: { sort: "newest" }, scope: {} },
  { label: "Men", search: { gender: "men" }, scope: { gender: "men" } },
  { label: "Women", search: { gender: "women" }, scope: { gender: "women" } },
  { label: "Kids", search: { kids: "boys,girls" }, scope: { kids: "boys,girls" } },
  { label: "Sale", search: { sale: 1 }, scope: { sale: 1 } }
];

/** Cột "Featured" của mega menu (đường dẫn gốc là `/w` + tham số). */
export const FEATURED_LINKS: { label: string; search: CatalogSearch }[] = [
  { label: "All Shoes", search: {} },
  { label: "Just In", search: { badge: "just-in" } },
  { label: "Bestsellers", search: { badge: "bestseller" } },
  { label: "Sale", search: { sale: 1 } }
];

/** Gắn tham số phạm vi của mục menu vào một link (`/w?...` hoặc `/w/<slug>?...`). */
export function withScope(
  base: { category?: string; search?: CatalogSearch },
  scope: CatalogSearch
): CatalogTarget {
  const search = { ...scope, ...base.search };
  return base.category
    ? { to: "/w/$category", category: base.category, search }
    : { to: "/w", search };
}

// ---------------------------------------------------------------------------------------------
// Bộ lọc của trang danh sách (plan danh-sach-giay §6.1 – §6.6)
// ---------------------------------------------------------------------------------------------

/** Số thẻ mỗi lần tải (plan danh-sach-giay §6.4, §11 câu 8). */
export const CATALOG_PAGE_SIZE = 12;

export type FilterKey = "gender" | "kids" | "price" | "sale" | "badge" | "size";

/** Lựa chọn đang chọn của từng nhóm, dạng giá trị URL (size dạng "40.5", "42"). */
export type Filters = Record<FilterKey, string[]>;

export interface FilterGroup {
  key: FilterKey;
  title: string;
  /** Lựa chọn cố định theo thứ tự hiển thị; size lấy từ `facets` nên rỗng */
  options: { value: string; label: string }[];
}

/** 6 nhóm lọc theo thứ tự sidebar (§6.3); testid lựa chọn = `filter-<key>-<value>`. */
export const FILTER_GROUPS: FilterGroup[] = [
  {
    key: "gender",
    title: "Gender",
    options: [
      { value: "men", label: "Men" },
      { value: "women", label: "Women" },
      { value: "unisex", label: "Unisex" }
    ]
  },
  {
    key: "kids",
    title: "Kids",
    options: [
      { value: "boys", label: "Boys" },
      { value: "girls", label: "Girls" }
    ]
  },
  {
    key: "price",
    title: "Shop by Price",
    options: PRICE_RANGES.map((p) => ({ value: p.value, label: p.label }))
  },
  { key: "sale", title: "Sale & Offers", options: [{ value: "1", label: "Sale" }] },
  {
    key: "badge",
    title: "New & Popular",
    options: [
      { value: "just-in", label: "Just In" },
      { value: "bestseller", label: "Bestsellers" }
    ]
  },
  { key: "size", title: "Size", options: [] }
];

export const FILTER_KEYS: FilterKey[] = FILTER_GROUPS.map((g) => g.key);

/** Nhóm mặc định mở ở sidebar (§6.3); nhóm đang có lựa chọn cũng mở. */
export const DEFAULT_OPEN_GROUPS: FilterKey[] = ["gender", "price"];

export type CatalogSort = NonNullable<CatalogSearch["sort"]>;

/** 4 kiểu sắp xếp (§6.2); `featured` là mặc định nên không ghi lên URL. */
export const SORT_OPTIONS: { value: CatalogSort; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-desc", label: "Price: High-Low" },
  { value: "price-asc", label: "Price: Low-High" }
];

export const EMPTY_FILTERS: Filters = {
  gender: [],
  kids: [],
  price: [],
  sale: [],
  badge: [],
  size: []
};

const splitCsv = (v: string | number | undefined) =>
  v == null || v === "" ? [] : String(v).split(",");

/** Đọc lựa chọn đang chọn từ search đã qua `catalogSearchSchema`. */
export function readFilters(search: CatalogSearch): Filters {
  return {
    gender: splitCsv(search.gender),
    kids: splitCsv(search.kids),
    price: splitCsv(search.price),
    sale: search.sale === 1 ? ["1"] : [],
    badge: splitCsv(search.badge),
    size: [...new Set(splitCsv(search.size).map((s) => String(Number(s))))]
  };
}

/** Giữ thứ tự lựa chọn hiển thị (size tăng dần), bỏ trùng / giá trị lạ. */
function ordered(key: FilterKey, values: string[]): string[] {
  if (key === "size") return [...new Set(values)].sort((a, b) => Number(a) - Number(b));
  const group = FILTER_GROUPS.find((g) => g.key === key);
  return (group?.options ?? []).map((o) => o.value).filter((v) => values.includes(v));
}

/**
 * Bộ lọc → 6 khoá search (§6.1 "Khi FE ghi URL"): thứ tự theo lựa chọn hiển thị, size tăng dần,
 * khoá rỗng = `undefined`. Một size ghi dạng số để router không bọc ngoặc kép (`size=42`).
 */
export function writeFilters(filters: Filters): Pick<CatalogSearch, FilterKey> {
  const csv = (key: FilterKey) => {
    const v = ordered(key, filters[key]);
    return v.length ? v.join(",") : undefined;
  };
  const sizes = ordered("size", filters.size);
  return {
    gender: csv("gender"),
    kids: csv("kids"),
    price: csv("price"),
    sale: filters.sale.includes("1") ? 1 : undefined,
    badge: csv("badge"),
    size: sizes.length === 0 ? undefined : sizes.length === 1 ? Number(sizes[0]) : sizes.join(",")
  };
}

/** Bỏ khoá `undefined` để URL gọn. */
function compact<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

/** Search mới = search cũ (giữ `q`, `sort`) với bộ lọc thay bằng `filters`. */
export function withFilters(search: CatalogSearch, filters: Filters): CatalogSearch {
  return compact({ ...search, ...writeFilters(filters) });
}

/** Search mới với kiểu sắp xếp `sort` (`featured` → bỏ khoá). */
export function withSort(search: CatalogSearch, sort: CatalogSort): CatalogSearch {
  return compact({ ...search, sort: sort === "featured" ? undefined : sort });
}

/** Bật / tắt một lựa chọn. */
export function toggleFilter(filters: Filters, key: FilterKey, value: string): Filters {
  const current = filters[key];
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  return { ...filters, [key]: next };
}

/** Bỏ 6 khoá lọc, giữ `q` và `sort` (nút "Clear Filters", §6.4). */
export function clearFilters(search: CatalogSearch): CatalogSearch {
  return withFilters(search, EMPTY_FILTERS);
}

/** Tổng số giá trị lọc đang chọn (không tính sắp xếp). */
export function activeFilterCount(filters: Filters): number {
  return FILTER_KEYS.reduce((n, k) => n + filters[k].length, 0);
}

/** Có ít nhất một bộ lọc (6 khoá) — quyết định chữ của trạng thái rỗng. */
export function hasFilters(search: CatalogSearch): boolean {
  return activeFilterCount(readFilters(search)) > 0;
}

/** `q` sau khi trim; rỗng → undefined. */
export function searchTerm(search: CatalogSearch): string | undefined {
  const q = search.q?.trim();
  return q ? q : undefined;
}

const AUDIENCE_BY_GENDER: Record<string, string> = {
  men: "Men's",
  women: "Women's",
  unisex: "Unisex"
};
const AUDIENCE_BY_KIDS: Record<string, string> = {
  boys: "Boys'",
  girls: "Girls'",
  "boys,girls": "Kids'"
};

/** Đối tượng trong tiêu đề theo `gender` + `kids` (bảng §6.1); trường hợp khác → null. */
function audienceOf(search: CatalogSearch): string | null {
  const { gender, kids } = writeFilters(readFilters(search));
  if (gender && !kids) return AUDIENCE_BY_GENDER[gender] ?? null;
  if (!gender && kids) return AUDIENCE_BY_KIDS[kids] ?? null;
  return null;
}

/**
 * Tiêu đề trang, chưa có số (§6.1): có `q` → chính `q` (đã trim); không thì
 * `[đối tượng] [danh mục] Shoes`, vd `Men's Basketball Shoes`, `Shoes`.
 */
export function catalogTitle(search: CatalogSearch, categoryName?: string | null): string {
  const q = searchTerm(search);
  if (q) return q;
  return [audienceOf(search), categoryName, "Shoes"].filter(Boolean).join(" ");
}

/** Search của URL → tham số `facets` (không có `sort`); khoá rỗng không gửi. */
export function toFilterParams(search: CatalogSearch, category?: string): ProductFilterParams {
  const f = writeFilters(readFilters(search));
  return compact({
    category,
    gender: f.gender,
    kids: f.kids,
    price: f.price,
    sale: f.sale ? "1" : undefined,
    badge: f.badge,
    size: f.size === undefined ? undefined : String(f.size),
    q: searchTerm(search)
  });
}

/** Search của URL → tham số `list` (thêm `sort`, chưa có `page` / `limit`). */
export function toListParams(
  search: CatalogSearch,
  category?: string
): Omit<ProductListParams, "page" | "limit"> {
  const sort = search.sort && search.sort !== "featured" ? search.sort : undefined;
  return compact({ ...toFilterParams(search, category), sort });
}
