/**
 * Định dạng tiền VNĐ đúng như giao diện: `5.279.000 ₫` (dấu chấm ngăn nghìn, khoảng trắng trước ₫).
 * @param {number} amount
 */
export const formatVnd = (amount) =>
  `${Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')} ₫`;

/**
 * Đọc chuỗi tiền trên giao diện về số: `5.279.000 ₫` → 5279000.
 * @param {string} text
 */
export const parseVnd = (text) => Number(text.replace(/[^\d]/g, ''));
