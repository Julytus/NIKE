-- =====================================================================
-- Seed CHỈ cho môi trường local (profile local: spring.flyway.locations có classpath:db/seed).
-- Mật khẩu mọi tài khoản: Admin@123 (bcrypt, cost 10)
--   admin@nike.local     — Administrator (operator, toàn quyền)
--   noaccess@nike.local  — No Access (chức vụ không có quyền nào)
--   free@nike.local      — Customer (khách hàng)
--   khach1@nike.local, khach2@nike.local — Customer, dùng cho test giỏ hàng / đơn hàng
-- Dữ liệu giày không nằm ở đây: ShoeSeedRunner nạp từ seed/giay/products.json khi khởi động.
-- =====================================================================
SET NAMES utf8mb4;

INSERT IGNORE INTO `role` (`id`, `name`, `is_default`, `is_operator`) VALUES
  (1, 'Administrator', 0, 1),
  (2, 'No Access', 0, 0);

INSERT IGNORE INTO `user_app` (`id`, `name`, `email`, `phone`, `password`, `has_password`, `role_id`, `active`, `first_time`) VALUES
  (1, 'Administrator', 'admin@nike.local', '0900000000',
   '$2a$10$m4Xd2KRfgDRy66eoscq7BuukZym.dvadrm3p8LX4IUxSOJudLsAiu', 1, 1, 1, 0),
  (2, 'No Access Staff', 'noaccess@nike.local', '0900000001',
   '$2a$10$m4Xd2KRfgDRy66eoscq7BuukZym.dvadrm3p8LX4IUxSOJudLsAiu', 1, 2, 1, 0),
  (3, 'Free Member', 'free@nike.local', NULL,
   '$2a$10$m4Xd2KRfgDRy66eoscq7BuukZym.dvadrm3p8LX4IUxSOJudLsAiu', 1, 3, 1, 0),
  (4, 'Customer One', 'khach1@nike.local', NULL,
   '$2a$10$m4Xd2KRfgDRy66eoscq7BuukZym.dvadrm3p8LX4IUxSOJudLsAiu', 1, 3, 1, 0),
  (5, 'Customer Two', 'khach2@nike.local', NULL,
   '$2a$10$m4Xd2KRfgDRy66eoscq7BuukZym.dvadrm3p8LX4IUxSOJudLsAiu', 1, 3, 1, 0);
