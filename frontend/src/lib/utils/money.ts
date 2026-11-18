const VND = new Intl.NumberFormat("vi-VN");

/** 5279000 → "5.279.000 ₫" (khoảng trắng thường trước ₫, plan giao-dien-nike §6). */
export const formatVnd = (amount: number) => `${VND.format(amount)} ₫`;
