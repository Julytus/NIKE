/**
 * "Làn" của project Playwright (plan dat-hang §7.1 bước 1): test giao diện ở pha `@stock` cần đặt tồn kho
 * dùng một size riêng cho mỗi project để 4 trình duyệt chạy song song không giẫm tồn kho của nhau.
 * chromium 0, firefox 1, webkit 2, mobile-chrome 3; project khác → 0.
 */
const LANES = { chromium: 0, firefox: 1, webkit: 2, 'mobile-chrome': 3 };

/** @param {import('@playwright/test').TestInfo} testInfo */
export function laneOf(testInfo) {
  return LANES[/** @type {keyof typeof LANES} */ (testInfo.project.name)] ?? 0;
}
