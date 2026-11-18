import { faker } from '@faker-js/faker';

/** Tiền tố cho mọi dữ liệu do test sinh ra, để dọn được bằng API. */
export const AUTO_PREFIX = 'AUTO-';

const stamp = () => `${Date.now().toString(36)}${faker.string.alphanumeric(4).toLowerCase()}`;

/** Email chưa từng đăng ký, vd `auto-lx3k9a1b2c@test.local`. */
export const uniqueEmail = () => `auto-${stamp()}@test.local`;

/** Tên duy nhất có tiền tố, vd `AUTO-lx3k9a1b2c` hoặc `AUTO-role-lx3k9a1b2c`. */
export const uniqueName = (prefix = '') =>
  `${AUTO_PREFIX}${prefix ? `${prefix}-` : ''}${stamp()}`;

/**
 * Tên duy nhất dài đúng `length` ký tự (dùng cho giá trị biên), bắt đầu bằng `AUTO-`.
 * @param {number} length
 */
export const uniqueNameOfLength = (length) => {
  const base = uniqueName();
  if (base.length >= length) return base.slice(0, length);
  return base + 'x'.repeat(length - base.length);
};
