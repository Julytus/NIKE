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
