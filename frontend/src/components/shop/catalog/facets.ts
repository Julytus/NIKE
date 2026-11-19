import type { FilterKey } from "@/lib/shop/catalog-search";
import type { ProductFacetsDTO } from "@/lib/types/product";

/** Một lựa chọn size hiển thị: giá trị URL ("40.5", "42") + nhãn ("EU 40.5"). */
export interface SizeOption {
  value: string;
  label: string;
}

/** Chuẩn hoá số size về dạng URL: 42.0 → "42", 40.5 → "40.5". */
export const sizeValue = (v: number | string) => String(Number(v));

/**
 * Số sản phẩm của một lựa chọn theo `facets` (plan danh-sach-giay §5.2);
 * chưa có `facets` (đang tải / lỗi) → undefined (không hiện số, không làm mờ).
 */
export function facetCount(
  facets: ProductFacetsDTO | undefined,
  key: FilterKey,
  value: string
): number | undefined {
  if (!facets) return undefined;
  switch (key) {
    case "sale":
      return facets.sale;
    case "size":
      return facets.size.find((s) => sizeValue(s.value) === value)?.count;
    default:
      return (facets[key] as Record<string, number>)[value];
  }
}

/**
 * Các nút size: theo `facets.size` (tăng dần); chưa có `facets` thì chỉ các size đang chọn trên URL (§6.3).
 */
export function sizeOptions(
  facets: ProductFacetsDTO | undefined,
  selected: string[]
): SizeOption[] {
  if (facets) return facets.size.map((s) => ({ value: sizeValue(s.value), label: s.label }));
  return [...selected]
    .sort((a, b) => Number(a) - Number(b))
    .map((v) => ({ value: v, label: `EU ${v}` }));
}
