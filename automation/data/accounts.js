import 'dotenv/config';

/**
 * Tài khoản kiểm thử theo vai trò. Đọc từ biến môi trường, mặc định là tài khoản local
 * do migration tạo sẵn.
 * @type {Record<'admin' | 'noaccess' | 'customer' | 'khach1' | 'khach2', { email: string, password: string }>}
 */
export const accounts = {
  admin: {
    email: process.env.ADMIN_EMAIL ?? 'admin@downbeat.local',
    password: process.env.ADMIN_PASSWORD ?? 'Admin@123',
  },
  noaccess: {
    email: process.env.NOACCESS_EMAIL ?? 'noaccess@downbeat.local',
    password: process.env.NOACCESS_PASSWORD ?? 'Admin@123',
  },
  customer: {
    email: process.env.CUSTOMER_EMAIL ?? 'free@downbeat.local',
    password: process.env.CUSTOMER_PASSWORD ?? 'Admin@123',
  },
  // Khách hàng test (seed V19_1, lát du-lieu-giay): dùng cho giỏ hàng / đơn hàng ở các lát sau.
  khach1: { email: 'khach1@downbeat.local', password: 'Admin@123' },
  khach2: { email: 'khach2@downbeat.local', password: 'Admin@123' },
};

/** Mật khẩu sai dùng cho các ca đăng nhập thất bại. */
export const WRONG_PASSWORD = 'Sai@12345';

/** Đường dẫn file storageState (đăng nhập sẵn) theo vai trò. */
export const storageStateOf = (/** @type {string} */ role) => `.auth/${role}.json`;
