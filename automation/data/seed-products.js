import { readFileSync } from 'node:fs';

/**
 * Dữ liệu mẫu cửa hàng giày — đọc thẳng `products.json` của backend (nguồn sự thật, plan du-lieu-giay §4.1)
 * để tính kết quả mong đợi thay vì ghi cứng số trong test.
 */

/**
 * @typedef {{ id: number, slug: string, name: string, sortOrder: number }} SeedCategory
 * @typedef {'MEN' | 'WOMEN' | 'UNISEX' | 'BOYS' | 'GIRLS'} Gender
 * @typedef {{
 *   id: number, slug: string, styleCode: string, name: string, subtitle: string, gender: Gender,
 *   category: string, description: string, price: number, salePrice: number | null,
 *   badge: 'JUST_IN' | 'BESTSELLER' | null, status: 'PUBLISHED' | 'HIDDEN' | 'DRAFT',
 *   createdTime: string, stock: Record<string, number>, sourceUrl: string, sourceImages: string[]
 * }} SeedProduct
 * @typedef {{ sizeLabel: string, sizeValue: number }} SeedSize
 */

const file = new URL(
  '../../backend/business/src/main/resources/seed/giay/products.json',
  import.meta.url
);
/** @type {{ categories: SeedCategory[], products: SeedProduct[] }} */
const seed = JSON.parse(readFileSync(file, 'utf8'));

export const seedCategories = seed.categories;
export const seedProducts = seed.products;

/** Số ảnh của mỗi sản phẩm. */
export const IMAGES_PER_PRODUCT = 5;
/** Tồn kho mặc định của một size khi `stock` trong JSON không ghi ngoại lệ. */
export const DEFAULT_STOCK = 20;

const MEN_SIZES = [38.5, 39, 40, 40.5, 41, 42, 42.5, 43, 44, 44.5, 45, 46, 47];
const WOMEN_SIZES = [35.5, 36, 36.5, 37.5, 38, 38.5, 39, 40, 40.5, 41, 42];
const KIDS_SIZES = [35.5, 36, 36.5, 37.5, 38, 38.5, 39, 40];

/** Nhãn size dạng "EU 40.5" / "EU 42" (không có ".0"). @param {number} value */
export const sizeLabel = (value) => `EU ${value}`;

/**
 * Lưới size theo giới tính, tăng dần (plan §4.1).
 * @param {Gender} gender
 * @returns {SeedSize[]}
 */
export function sizesOf(gender) {
  const values =
    gender === 'MEN' || gender === 'UNISEX'
      ? MEN_SIZES
      : gender === 'WOMEN'
        ? WOMEN_SIZES
        : KIDS_SIZES;
  return values.map((v) => ({ sizeLabel: sizeLabel(v), sizeValue: v }));
}

/**
 * Tồn kho từng size của sản phẩm (mặc định 20, áp ngoại lệ trong `stock`).
 * @param {SeedProduct} product
 * @returns {(SeedSize & { stock: number })[]}
 */
export function stockOf(product) {
  return sizesOf(product.gender).map((s) => ({
    ...s,
    stock: product.stock?.[s.sizeLabel] ?? DEFAULT_STOCK,
  }));
}

/** Giá đang bán = giá giảm nếu có, không thì giá gốc. @param {SeedProduct} product */
export const sellingPrice = (product) => product.salePrice ?? product.price;

/** Sản phẩm đang bán (`PUBLISHED`). */
export const publishedProducts = () => seedProducts.filter((p) => p.status === 'PUBLISHED');

/**
 * Số liệu `GET /test-support/summary` mong đợi (plan §5.1), trừ `missingImages`, `sample`, `resetAt`.
 */
export function expectedSummary() {
  const published = publishedProducts();
  const allSizes = seedProducts.flatMap(stockOf);
  /** @type {Record<string, number>} */
  const byCategory = {};
  for (const c of [...seedCategories].sort((a, b) => a.sortOrder - b.sortOrder)) {
    byCategory[c.slug] = published.filter((p) => p.category === c.slug).length;
  }
  /** @type {Record<string, number>} */
  const byGender = {};
  for (const g of ['MEN', 'WOMEN', 'UNISEX', 'BOYS', 'GIRLS']) {
    byGender[g] = published.filter((p) => p.gender === g).length;
  }
  return {
    categories: seedCategories.length,
    products: seedProducts.length,
    publishedProducts: published.length,
    hiddenProducts: seedProducts.filter((p) => p.status === 'HIDDEN').length,
    images: seedProducts.length * IMAGES_PER_PRODUCT,
    sizes: allSizes.length,
    outOfStockSizes: allSizes.filter((s) => s.stock === 0).length,
    totalStock: allSizes.reduce((sum, s) => sum + s.stock, 0),
    byCategory,
    byGender,
    onSale: published.filter((p) => p.salePrice !== null).length,
    justIn: published.filter((p) => p.badge === 'JUST_IN').length,
    bestseller: published.filter((p) => p.badge === 'BESTSELLER').length,
  };
}

/* ---------- Lát giao-dien-nike (plan §7.1): kết quả mong đợi của 3 API công khai ---------- */

/** Giới hạn số dòng của API (plan giao-dien-nike §5.2, §5.3). */
export const NEW_ARRIVALS_LIMIT = 12;
export const SUGGEST_LIMIT = 6;

/**
 * Chuẩn hoá chuỗi để so như collation `utf8mb4_0900_ai_ci`: bỏ dấu, chữ thường.
 * (Test không dùng chữ "đ" — collation coi "đ" ≠ "d" nhưng NFD không tách được.)
 * @param {string | null | undefined} s
 */
export const normalizeText = (s) => (s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Mới nhất trước: `createdTime` giảm dần, bằng nhau thì id lớn trước. @param {SeedProduct} a @param {SeedProduct} b */
const newestFirst = (a, b) =>
  a.createdTime === b.createdTime ? b.id - a.id : a.createdTime < b.createdTime ? 1 : -1;

/** Tổng tồn kho mọi size. @param {SeedProduct} product */
export const totalStockOf = (product) => stockOf(product).reduce((sum, s) => sum + s.stock, 0);

/**
 * "Thẻ sản phẩm" mong đợi (các field so được với API, trừ `imageUrl` kiểm theo đuôi).
 * @param {SeedProduct} p
 */
export const cardOf = (p) => ({
  id: p.id,
  slug: p.slug,
  styleCode: p.styleCode,
  name: p.name,
  subtitle: p.subtitle,
  gender: p.gender,
  price: p.price,
  salePrice: p.salePrice,
  badge: p.badge,
  totalStock: totalStockOf(p),
});

/** Đuôi URL ảnh số 1 của sản phẩm. @param {string} slug */
export const imageSuffixOf = (slug) => `/products/${slug}/1.webp`;

/**
 * `GET /product-category/public/list` mong đợi: theo `sortOrder`; `productCount` = số sản phẩm PUBLISHED;
 * `imageSlug` = slug sản phẩm PUBLISHED mới nhất của danh mục (không có → null).
 */
export function expectedCategories() {
  const published = publishedProducts();
  return [...seedCategories]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
    .map((c) => {
      const inCat = published.filter((p) => p.category === c.slug).sort(newestFirst);
      return {
        id: c.id,
        slug: c.slug,
        name: c.name,
        sortOrder: c.sortOrder,
        productCount: inCat.length,
        imageSlug: inCat[0]?.slug ?? null,
      };
    });
}

/** `GET /product/public/new-arrivals` mong đợi: PUBLISHED + JUST_IN, mới nhất trước, tối đa 12. */
export function expectedNewArrivals() {
  return publishedProducts()
    .filter((p) => p.badge === 'JUST_IN')
    .sort(newestFirst)
    .slice(0, NEW_ARRIVALS_LIMIT)
    .map(cardOf);
}

/**
 * `GET /product/public/suggest?q=` mong đợi (plan §5.3): trim; rỗng → total 0;
 * PUBLISHED và tên / phụ đề / mã chứa `q` (không phân biệt hoa thường, dấu); tối đa 6.
 * @param {string | null | undefined} q
 */
export function expectedSuggest(q) {
  const keyword = normalizeText((q ?? '').trim());
  if (!keyword) return { total: 0, page: 1, items: [] };
  const matched = publishedProducts()
    .filter((p) =>
      [p.name, p.subtitle, p.styleCode].some((f) => normalizeText(f).includes(keyword))
    )
    .sort(newestFirst);
  return { total: matched.length, page: 1, items: matched.slice(0, SUGGEST_LIMIT).map(cardOf) };
}

/* ---------- Lát danh-sach-giay (plan §5.0 – §5.2, §6.1): lọc / sắp xếp / đếm theo bộ lọc ---------- */

/** Số thẻ mỗi trang mặc định và trần `limit` (plan danh-sach-giay §5.1). */
export const CATALOG_PAGE_SIZE = 12;
export const CATALOG_MAX_LIMIT = 48;

/** 4 khoảng giá đang bán, hai đầu đều tính (plan §5.0). Thứ tự = thứ tự hiển thị. */
export const PRICE_BOUNDS = {
  'under-1m': [0, 999_999],
  '1m-2m': [1_000_000, 2_000_000],
  '2m-5m': [2_000_001, 4_999_999],
  '5m-plus': [5_000_000, Number.MAX_SAFE_INTEGER],
};

/** Giá trị URL → giá trị cột `product.gender` (gender + kids là một nhóm). @type {Record<string, Gender>} */
const GENDER_VALUES = { men: 'MEN', women: 'WOMEN', unisex: 'UNISEX' };
/** @type {Record<string, Gender>} */
const KIDS_VALUES = { boys: 'BOYS', girls: 'GIRLS' };
/** @type {Record<string, 'JUST_IN' | 'BESTSELLER'>} */
const BADGE_VALUES = { 'just-in': 'JUST_IN', bestseller: 'BESTSELLER' };

/**
 * Bộ lọc dạng query string (khoá giống URL `/w`), vd `{ gender: 'men,women', size: '42' }`.
 * @typedef {Partial<Record<'category' | 'gender' | 'kids' | 'price' | 'sale' | 'badge' | 'size' | 'q' | 'sort', string>>} CatalogFilter
 * @typedef {{
 *   category: string | null, genders: Set<string>, prices: Set<string>, sale: boolean,
 *   badges: Set<string>, sizes: Set<number>, keyword: string | null
 * }} ParsedCatalogFilter
 * @typedef {'gender' | 'price' | 'sale' | 'badge' | 'size'} CatalogGroup
 */

/** Tách dấu phẩy, trim, chữ thường, bỏ phần rỗng. @param {string | undefined} v */
const splitValues = (v) =>
  (v ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

/**
 * Chuẩn hoá bộ lọc như server (§5.0): giá trị lạ bị bỏ, slug danh mục giữ nguyên (server 404 nếu lạ).
 * @param {CatalogFilter} filter
 * @returns {ParsedCatalogFilter}
 */
export function parseCatalogFilter(filter) {
  const genders = new Set(
    [
      ...splitValues(filter.gender).map((v) => GENDER_VALUES[v]),
      ...splitValues(filter.kids).map((v) => KIDS_VALUES[v]),
    ].filter(Boolean)
  );
  const prices = new Set(splitValues(filter.price).filter((v) => v in PRICE_BOUNDS));
  const badges = new Set(
    splitValues(filter.badge)
      .map((v) => BADGE_VALUES[v])
      .filter(Boolean)
  );
  const sizes = new Set(
    splitValues(filter.size)
      .filter((v) => /^\d+(\.\d+)?$/.test(v))
      .map(Number)
  );
  const keyword = normalizeText((filter.q ?? '').trim()) || null;
  const category = (filter.category ?? '').trim().toLowerCase() || null;
  return { category, genders, prices, sale: filter.sale?.trim() === '1', badges, sizes, keyword };
}

/**
 * Sản phẩm khớp bộ lọc (chỉ PUBLISHED), bỏ điều kiện của nhóm `skip` (đếm facets "bỏ nhóm của chính mình").
 * @param {SeedProduct} p
 * @param {ParsedCatalogFilter} f
 * @param {CatalogGroup | null} [skip]
 */
export function matchesCatalog(p, f, skip = null) {
  if (p.status !== 'PUBLISHED') return false;
  if (f.category && p.category !== f.category) return false;
  const keyword = f.keyword;
  if (
    keyword &&
    ![p.name, p.subtitle, p.styleCode].some((s) => normalizeText(s).includes(keyword))
  ) {
    return false;
  }
  if (skip !== 'gender' && f.genders.size && !f.genders.has(p.gender)) return false;
  if (skip !== 'price' && f.prices.size) {
    const price = sellingPrice(p);
    const inRange = [...f.prices].some((r) => {
      const [lo, hi] = PRICE_BOUNDS[/** @type {keyof typeof PRICE_BOUNDS} */ (r)];
      return price >= lo && price <= hi;
    });
    if (!inRange) return false;
  }
  if (skip !== 'sale' && f.sale && p.salePrice === null) return false;
  if (skip !== 'badge' && f.badges.size && !(p.badge && f.badges.has(p.badge))) return false;
  if (skip !== 'size' && f.sizes.size) {
    if (!stockOf(p).some((s) => f.sizes.has(s.sizeValue) && s.stock > 0)) return false;
  }
  return true;
}

/** Thứ hạng nhãn trong "Featured": Just In → Bestseller → không nhãn. @param {SeedProduct} p */
const badgeRank = (p) => (p.badge === 'JUST_IN' ? 0 : p.badge === 'BESTSELLER' ? 1 : 2);

/**
 * Hàm so sánh theo `sort` (plan §5.1); giá trị lạ → `featured`. Luôn kết thúc bằng mới nhất trước.
 * @param {string | undefined} sort
 * @returns {(a: SeedProduct, b: SeedProduct) => number}
 */
export function catalogComparator(sort) {
  const key = (sort ?? '').trim().toLowerCase();
  if (key === 'newest') return newestFirst;
  if (key === 'price-desc') return (a, b) => sellingPrice(b) - sellingPrice(a) || newestFirst(a, b);
  if (key === 'price-asc') return (a, b) => sellingPrice(a) - sellingPrice(b) || newestFirst(a, b);
  return (a, b) =>
    Number(totalStockOf(a) === 0) - Number(totalStockOf(b) === 0) ||
    badgeRank(a) - badgeRank(b) ||
    newestFirst(a, b);
}

/** Mọi sản phẩm khớp bộ lọc, đã sắp xếp (chưa phân trang). @param {CatalogFilter} filter */
export function catalogProducts(filter) {
  const parsed = parseCatalogFilter(filter);
  return seedProducts.filter((p) => matchesCatalog(p, parsed)).sort(catalogComparator(filter.sort));
}

/**
 * `GET /product/public/list` mong đợi: `page` < 1 → 1; `limit` < 1 → 12, > 48 → 48.
 * @param {CatalogFilter} filter
 * @param {{ page?: number, limit?: number }} [paging]
 */
export function expectedList(filter, { page = 1, limit = CATALOG_PAGE_SIZE } = {}) {
  const p = page < 1 ? 1 : page;
  const l = limit < 1 ? CATALOG_PAGE_SIZE : Math.min(limit, CATALOG_MAX_LIMIT);
  const all = catalogProducts(filter);
  return { total: all.length, page: p, items: all.slice((p - 1) * l, p * l).map(cardOf) };
}

/** Mọi size có trong `product_size` của sản phẩm PUBLISHED, tăng dần. */
export function publishedSizeValues() {
  const values = new Set(
    publishedProducts().flatMap((p) => sizesOf(p.gender).map((s) => s.sizeValue))
  );
  return [...values].sort((a, b) => a - b);
}

/**
 * `GET /product/public/facets` mong đợi (plan §5.2): mỗi số = số sản phẩm khớp các nhóm khác + lựa chọn đó.
 * @param {CatalogFilter} filter
 */
export function expectedFacets(filter) {
  const f = parseCatalogFilter(filter);
  /** @param {CatalogGroup} skip */
  const pool = (skip) => seedProducts.filter((p) => matchesCatalog(p, f, skip));
  const genderPool = pool('gender');
  /** @param {Record<string, string>} values */
  const byGender = (values) =>
    Object.fromEntries(
      Object.entries(values).map(([k, g]) => [k, genderPool.filter((p) => p.gender === g).length])
    );
  const pricePool = pool('price');
  const badgePool = pool('badge');
  const sizePool = pool('size');
  return {
    gender: byGender(GENDER_VALUES),
    kids: byGender(KIDS_VALUES),
    price: Object.fromEntries(
      Object.entries(PRICE_BOUNDS).map(([k, [lo, hi]]) => [
        k,
        pricePool.filter((p) => sellingPrice(p) >= lo && sellingPrice(p) <= hi).length,
      ])
    ),
    sale: pool('sale').filter((p) => p.salePrice !== null).length,
    badge: Object.fromEntries(
      Object.entries(BADGE_VALUES).map(([k, b]) => [
        k,
        badgePool.filter((p) => p.badge === b).length,
      ])
    ),
    size: publishedSizeValues().map((value) => ({
      value,
      label: sizeLabel(value),
      count: sizePool.filter((p) => stockOf(p).some((s) => s.sizeValue === value && s.stock > 0))
        .length,
    })),
  };
}

/**
 * Tiêu đề trang danh sách (không có số) — plan §6.1: có `q` → `q` đã trim; không thì
 * `[đối tượng] [tên danh mục] Shoes`.
 * @param {CatalogFilter} filter
 * @param {string | null} [categoryName]
 */
export function catalogTitle(filter, categoryName = null) {
  const q = (filter.q ?? '').trim();
  if (q) return q;
  /** @type {Record<string, string>} */
  const audiences = {
    'men|': "Men's",
    'women|': "Women's",
    'unisex|': 'Unisex',
    '|boys': "Boys'",
    '|girls': "Girls'",
    '|boys,girls': "Kids'",
  };
  const audience = audiences[`${(filter.gender ?? '').trim()}|${(filter.kids ?? '').trim()}`];
  return [audience, categoryName, 'Shoes'].filter(Boolean).join(' ');
}

/* ---------- Lát chi-tiet-giay (plan §5.1, §5.2, §6.4): chi tiết, "You Might Also Like", giảm giá, sắp hết hàng ---------- */

/** Số thẻ tối đa của `related` (plan chi-tiet-giay §5.2). */
export const RELATED_LIMIT = 8;
/** Tồn kho tối đa còn hiện "Just a few left. Order soon." (plan §6.4 mục 5). */
export const LOW_STOCK_MAX = 3;

/**
 * Sản phẩm theo slug (mọi trạng thái); không có → ném lỗi để test hỏng rõ ràng.
 * @param {string} slug
 * @returns {SeedProduct}
 */
export function seedBySlug(slug) {
  const p = seedProducts.find((x) => x.slug === slug);
  if (!p) throw new Error(`Không có sản phẩm "${slug}" trong products.json`);
  return p;
}

/** id danh mục theo slug danh mục. @param {SeedProduct} p */
const categoryIdOf = (p) =>
  /** @type {SeedCategory} */ (seedCategories.find((c) => c.slug === p.category)).id;

/**
 * `GET /product/public/get?slug=` mong đợi (plan §5.1), trừ `url` ảnh kiểm theo đuôi `urlSuffix`.
 * Ảnh id = productId × 10 + sortOrder; size id = productId × 100 + thứ tự (1-based) trong lưới.
 * @param {string} slug
 */
export function expectedDetail(slug) {
  const p = seedBySlug(slug);
  return {
    ...cardOf(p),
    categoryId: categoryIdOf(p),
    description: p.description,
    images: Array.from({ length: IMAGES_PER_PRODUCT }, (_, i) => ({
      id: p.id * 10 + i + 1,
      productId: p.id,
      sortOrder: i + 1,
      urlSuffix: `/products/${p.slug}/${i + 1}.webp`,
    })),
    sizes: stockOf(p).map((s, i) => ({
      id: p.id * 100 + i + 1,
      productId: p.id,
      sizeLabel: s.sizeLabel,
      sizeValue: s.sizeValue,
      stock: s.stock,
    })),
  };
}

/**
 * `GET /product/public/related?slug=` mong đợi (plan §5.2): PUBLISHED, khác chính nó,
 * cùng danh mục trước rồi danh mục khác, trong mỗi phần theo "Featured"; tối đa 8.
 * @param {string} slug
 */
export function expectedRelated(slug) {
  const current = seedBySlug(slug);
  const featured = catalogComparator('featured');
  return publishedProducts()
    .filter((p) => p.id !== current.id)
    .sort(
      (a, b) =>
        Number(a.category !== current.category) - Number(b.category !== current.category) ||
        featured(a, b)
    )
    .slice(0, RELATED_LIMIT)
    .map(cardOf);
}

/**
 * Phần trăm giảm làm tròn xuống (plan §6.4 mục 3); không giảm → 0.
 * @param {SeedProduct} p
 */
export const discountPercent = (p) =>
  p.salePrice === null ? 0 : Math.floor(((p.price - p.salePrice) * 100) / p.price);

/**
 * Có hiện "Just a few left. Order soon." không (plan §6.4 mục 5): tồn của size đang chọn,
 * hoặc tổng tồn khi chưa chọn size, nằm trong 1 → 3.
 * @param {SeedProduct} p
 * @param {string | null} [selectedSizeLabel] vd "EU 42"
 */
export function lowStockShown(p, selectedSizeLabel = null) {
  const n =
    selectedSizeLabel === null
      ? totalStockOf(p)
      : (stockOf(p).find((s) => s.sizeLabel === selectedSizeLabel)?.stock ?? 0);
  return n >= 1 && n <= LOW_STOCK_MAX;
}

/* ---------- Lát gio-hang (plan §4, §5.1): giỏ localStorage + `POST /cart/public/check` ---------- */

/** Số đôi tối đa của một size trong giỏ và số dòng tối đa của giỏ (plan gio-hang §5.2). */
export const MAX_CART_QUANTITY = 10;
export const MAX_CART_LINES = 50;
/** Phí giao hàng (D12): 30.000 ₫, miễn phí khi tạm tính từ 5.000.000 ₫. */
export const FREE_SHIPPING_THRESHOLD = 5_000_000;
export const SHIPPING_FEE = 30_000;

/**
 * Size id của dữ liệu mẫu = productId × 100 + thứ tự (1-based) trong lưới size.
 * @param {string} slug
 * @param {string} label vd "EU 42"
 */
export function sizeIdOf(slug, label) {
  const p = seedBySlug(slug);
  const index = sizesOf(p.gender).findIndex((s) => s.sizeLabel === label);
  if (index < 0) throw new Error(`"${slug}" không có size "${label}"`);
  return p.id * 100 + index + 1;
}

/**
 * Sản phẩm + size theo size id; không có → null.
 * @param {number} sizeId
 */
export function seedSizeOf(sizeId) {
  const product = seedProducts.find((p) => p.id === Math.floor(sizeId / 100));
  const size = product ? stockOf(product)[(sizeId % 100) - 1] : undefined;
  return product && size ? { product, size } : null;
}

/** Phí giao hàng theo tạm tính (plan §5.1). @param {number} subtotal */
export const shippingFeeOf = (subtotal) =>
  subtotal <= 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;

/**
 * Kết quả `POST /cart/public/check` mong đợi (plan §5.1), `imageUrl` thay bằng đuôi `/products/<slug>/1.webp`.
 * @param {{ sizeId: number, quantity: number }[]} items
 */
export function expectedCartCheck(items) {
  const lines = items.map(({ sizeId, quantity }) => {
    const found = seedSizeOf(sizeId);
    if (!found) {
      return {
        sizeId,
        quantity,
        status: 'UNAVAILABLE',
        availableQuantity: 0,
        stock: 0,
        productId: null,
        slug: null,
        name: null,
        subtitle: null,
        imageUrl: null,
        sizeLabel: null,
        price: null,
        salePrice: null,
        unitPrice: null,
        lineTotal: 0,
      };
    }
    const { product: p, size } = found;
    const status =
      p.status !== 'PUBLISHED'
        ? 'UNAVAILABLE'
        : size.stock === 0
          ? 'OUT_OF_STOCK'
          : size.stock < quantity
            ? 'INSUFFICIENT_STOCK'
            : 'AVAILABLE';
    const availableQuantity =
      status === 'AVAILABLE' ? quantity : status === 'INSUFFICIENT_STOCK' ? size.stock : 0;
    const unitPrice = sellingPrice(p);
    return {
      sizeId,
      quantity,
      status,
      availableQuantity,
      stock: status === 'UNAVAILABLE' ? 0 : size.stock,
      productId: p.id,
      slug: p.slug,
      name: p.name,
      subtitle: p.subtitle,
      imageUrl: imageSuffixOf(p.slug),
      sizeLabel: size.sizeLabel,
      price: p.price,
      salePrice: p.salePrice,
      unitPrice,
      lineTotal: unitPrice * availableQuantity,
    };
  });
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const shippingFee = shippingFeeOf(subtotal);
  return {
    items: lines,
    itemCount: lines.reduce((sum, l) => sum + l.availableQuantity, 0),
    subtotal,
    shippingFee,
    total: subtotal + shippingFee,
  };
}
