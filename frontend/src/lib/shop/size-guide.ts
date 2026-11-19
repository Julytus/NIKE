import type { ProductDetailDTO } from "@/lib/types/product";
import { sizeTestValue } from "./product-detail";

/** Một dòng bảng quy đổi; `usKids` null = trẻ em không có size này. */
interface SizeChartRow {
  eu: string;
  uk: string;
  usMen: string;
  usWomen: string;
  usKids: string | null;
  cm: string;
}

/**
 * Bảng quy đổi size tĩnh (plan chi-tiet-giay §6.5, §11 câu 7): theo bảng size nam của nike.com,
 * US nữ = US nam + 1,5; trẻ em lớn = số US nam + "Y".
 */
export const SIZE_CHART: readonly SizeChartRow[] = [
  { eu: "35.5", uk: "3", usMen: "3.5", usWomen: "5", usKids: "3.5Y", cm: "22.5" },
  { eu: "36", uk: "3.5", usMen: "4", usWomen: "5.5", usKids: "4Y", cm: "23" },
  { eu: "36.5", uk: "4", usMen: "4.5", usWomen: "6", usKids: "4.5Y", cm: "23.5" },
  { eu: "37.5", uk: "4.5", usMen: "5", usWomen: "6.5", usKids: "5Y", cm: "23.5" },
  { eu: "38", uk: "5", usMen: "5.5", usWomen: "7", usKids: "5.5Y", cm: "24" },
  { eu: "38.5", uk: "5.5", usMen: "6", usWomen: "7.5", usKids: "6Y", cm: "24" },
  { eu: "39", uk: "6", usMen: "6.5", usWomen: "8", usKids: "6.5Y", cm: "24.5" },
  { eu: "40", uk: "6", usMen: "7", usWomen: "8.5", usKids: "7Y", cm: "25" },
  { eu: "40.5", uk: "6.5", usMen: "7.5", usWomen: "9", usKids: null, cm: "25.5" },
  { eu: "41", uk: "7", usMen: "8", usWomen: "9.5", usKids: null, cm: "26" },
  { eu: "42", uk: "7.5", usMen: "8.5", usWomen: "10", usKids: null, cm: "26.5" },
  { eu: "42.5", uk: "8", usMen: "9", usWomen: "10.5", usKids: null, cm: "27" },
  { eu: "43", uk: "8.5", usMen: "9.5", usWomen: "11", usKids: null, cm: "27.5" },
  { eu: "44", uk: "9", usMen: "10", usWomen: "11.5", usKids: null, cm: "28" },
  { eu: "44.5", uk: "9.5", usMen: "10.5", usWomen: "12", usKids: null, cm: "28.5" },
  { eu: "45", uk: "10", usMen: "11", usWomen: "12.5", usKids: null, cm: "29" },
  { eu: "46", uk: "11", usMen: "12", usWomen: "13.5", usKids: null, cm: "30" },
  { eu: "47", uk: "11.5", usMen: "12.5", usWomen: "14", usKids: null, cm: "30.5" }
];

const MISSING = "—";

/** Tiêu đề cột US theo giới tính sản phẩm (§6.5). */
export function usColumnTitle(gender: string): string {
  if (gender === "MEN") return "US Men's";
  if (gender === "WOMEN") return "US Women's";
  if (gender === "UNISEX") return "US";
  return "US Kids'";
}

/** Giá trị cột US của một dòng theo giới tính (§6.5); không có trong bảng → "—". */
export function usValue(gender: string, row: SizeChartRow): string {
  if (gender === "MEN") return row.usMen;
  if (gender === "WOMEN") return row.usWomen;
  if (gender === "UNISEX") return `M ${row.usMen} / W ${row.usWomen}`;
  return row.usKids ?? MISSING;
}

export interface SizeGuideRow {
  sizeId: number;
  eu: string;
  uk: string;
  us: string;
  cm: string;
}

/** Các dòng bảng size của sản phẩm: đúng các size của sản phẩm, cùng thứ tự lưới (kể cả size hết hàng). */
export function sizeGuideRows(product: Pick<ProductDetailDTO, "gender" | "sizes">): SizeGuideRow[] {
  return product.sizes.map((s) => {
    const eu = sizeTestValue(s.sizeValue);
    const row = SIZE_CHART.find((r) => r.eu === eu);
    return row
      ? { sizeId: s.id, eu, uk: row.uk, us: usValue(product.gender, row), cm: row.cm }
      : { sizeId: s.id, eu, uk: MISSING, us: MISSING, cm: MISSING };
  });
}
