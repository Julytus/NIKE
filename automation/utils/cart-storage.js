/* global window -- dùng trong page.evaluate (chạy ở trình duyệt) */

/** Khoá localStorage của giỏ hàng (plan gio-hang §4, D8). */
export const CART_KEY = 'nike.cart';

/** @typedef {{ sizeId: number, quantity: number }} CartItem */

/**
 * Ghi giỏ vào localStorage. Nếu trang chưa ở origin của cửa hàng thì mở `/` trước.
 * Dùng `page.evaluate` (không dùng `addInitScript`) để F5 không ghi đè giỏ.
 * @param {import('@playwright/test').Page} page
 * @param {CartItem[] | string} items mảng giỏ, hoặc chuỗi thô (kiểm dữ liệu hỏng)
 */
export async function setCart(page, items) {
  if (!page.url().startsWith('http')) await page.goto('/', { waitUntil: 'load' });
  const raw = typeof items === 'string' ? items : JSON.stringify(items);
  await page.evaluate(([key, value]) => window.localStorage.setItem(key, value), [CART_KEY, raw]);
}

/**
 * Đọc giỏ trong localStorage: `null` nếu chưa có khoá; chuỗi không phải JSON thì trả chuỗi thô.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<CartItem[] | string | null>}
 */
export async function readCart(page) {
  const raw = await page.evaluate((key) => window.localStorage.getItem(key), CART_KEY);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
