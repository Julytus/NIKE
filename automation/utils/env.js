import 'dotenv/config';

/** Địa chỉ frontend (cửa hàng + trang quản trị). */
export const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4500';

/** Địa chỉ gốc của REST API backend (đã gồm `/api`). */
export const API_URL = (process.env.API_URL ?? 'http://localhost:9500/api').replace(/\/$/, '');
