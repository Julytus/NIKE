import { laneOf } from '../utils/lane.js';
import { seedBySlug, seedSizeOf, sellingPrice } from './seed-products.js';

export { DELIVERY } from './orders.js';

/**
 * Dữ liệu các luồng xuyên suốt (plan kiem-thu-hoi-quy §3, §4). Mỗi luồng dùng một sản phẩm và một size
 * riêng cho từng project (làn chromium / firefox / webkit / mobile-chrome) để 4 trình duyệt chạy song song
 * không giẫm tồn kho của nhau; các size này chưa spec `@stock` nào khác dùng. Tên / giá / nhãn size đọc
 * từ `products.json`, không ghi cứng.
 */

/** Tồn kho đặt lại ở đầu mỗi luồng (`testSupport.setStockOk`). */
export const FLOW_STOCK = 20;

/** Size id theo làn (`null` = project đó không chạy luồng). */
export const FLOW_LANES = Object.freeze({
  F1: { slug: 'nike-vomero-18', sizes: [1506, 1507, 1508, 1509] },
  F2: { slug: 'nike-phantom-6-low-academy', sizes: [3002, 3003, 3004, null] },
  F3: { slug: 'nike-air-max-phenomena', sizes: [806, 807, 808, 809] },
  F4: { slug: 'jordan-franchise', sizes: [2802, 2803, 2804, null] },
  F5a: { slug: 'nike-offcourt', sizes: [602, 603, 604, null] },
  F5b: { slug: 'nike-offcourt', sizes: [607, 608, 609, null] },
  TC13: { slug: 'nike-air-max-phenomena', sizes: [802, 803, 804, null] },
});

/** @typedef {keyof typeof FLOW_LANES} FlowName */

/**
 * Sản phẩm + size của luồng ở project đang chạy.
 * @param {FlowName} flow
 * @param {import('@playwright/test').TestInfo} testInfo
 */
export function flowOf(flow, testInfo) {
  const lane = FLOW_LANES[flow];
  const sizeId = lane.sizes[laneOf(testInfo)];
  if (sizeId == null) throw new Error(`${flow} không chạy ở project ${testInfo.project.name}`);
  const product = seedBySlug(lane.slug);
  const seed = seedSizeOf(sizeId);
  if (!product || !seed || seed.product.slug !== lane.slug) {
    throw new Error(`size ${sizeId} không thuộc ${lane.slug} trong products.json`);
  }
  return {
    slug: lane.slug,
    name: product.name,
    /** Giá bán (giá giảm nếu có), số VNĐ. */
    price: sellingPrice(product),
    sizeId,
    /** Nhãn hiển thị, vd "EU 38.5". */
    sizeLabel: seed.size.sizeLabel,
    /** Giá trị dùng ở bộ lọc / URL, vd "38.5". */
    sizeValue: String(seed.size.sizeValue),
  };
}

/** Tên tài khoản tạo mới ở F3 (đăng ký trên giao diện). */
export const NEW_CUSTOMER_NAME = 'Auto Flow Customer';
