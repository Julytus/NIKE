-- Lát du-lieu-giay (plan/du-lieu-giay.md §4): hai khách hàng cho test giỏ hàng / đơn hàng ở các lát sau.
-- Mật khẩu Admin@123 (cùng hash với free@nike.local ở V5_1).
SET NAMES utf8mb4;

INSERT INTO `user_app` (`name`, `email`, `password`, `has_password`, `role_id`, `active`, `first_time`)
SELECT 'Khách Một', 'khach1@nike.local',
       '$2a$10$m4Xd2KRfgDRy66eoscq7BuukZym.dvadrm3p8LX4IUxSOJudLsAiu', 1,
       (SELECT `id` FROM `role` WHERE `name` = 'Khách hàng' LIMIT 1), 1, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `user_app` WHERE `email` = 'khach1@nike.local');

INSERT INTO `user_app` (`name`, `email`, `password`, `has_password`, `role_id`, `active`, `first_time`)
SELECT 'Khách Hai', 'khach2@nike.local',
       '$2a$10$m4Xd2KRfgDRy66eoscq7BuukZym.dvadrm3p8LX4IUxSOJudLsAiu', 1,
       (SELECT `id` FROM `role` WHERE `name` = 'Khách hàng' LIMIT 1), 1, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `user_app` WHERE `email` = 'khach2@nike.local');
