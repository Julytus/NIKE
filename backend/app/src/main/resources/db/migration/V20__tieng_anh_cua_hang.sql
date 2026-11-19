-- =====================================================================
-- V20: lát tieng-anh-cua-hang (plan/tieng-anh-cua-hang.md §4) — chuyển dữ liệu có sẵn sang tiếng Anh.
-- Chỉ UPDATE, không đổi cấu trúc, không thêm / xoá dòng. DB rỗng: không dòng nào khớp → không làm gì.
-- DB mới / test-support/reset: nguồn sự thật vẫn là seed/giay/products.json (đã sửa cùng nội dung).
-- Seed V1_1 / V5_1 / V19_1 tra role theo tên cũ nhưng đều chạy trước V20 nên đổi tên ở đây an toàn.
-- =====================================================================
SET NAMES utf8mb4;

-- Danh mục (khớp theo id)
UPDATE `product_category` SET `slug` = 'running',    `name` = 'Running'    WHERE `id` = 2 AND `slug` = 'chay-bo';
UPDATE `product_category` SET `slug` = 'basketball', `name` = 'Basketball' WHERE `id` = 3 AND `slug` = 'bong-ro';
UPDATE `product_category` SET `slug` = 'football',   `name` = 'Football'   WHERE `id` = 5 AND `slug` = 'bong-da';

-- Phụ đề sản phẩm (khớp theo giá trị cũ)
UPDATE `product` SET `subtitle` = 'Men''s Shoes'                              WHERE `subtitle` = 'Giày nam';
UPDATE `product` SET `subtitle` = 'Women''s Shoes'                            WHERE `subtitle` = 'Giày nữ';
UPDATE `product` SET `subtitle` = 'Men''s Slides'                             WHERE `subtitle` = 'Dép nam';
UPDATE `product` SET `subtitle` = 'Women''s Slides'                           WHERE `subtitle` = 'Dép nữ';
UPDATE `product` SET `subtitle` = 'Slides'                                    WHERE `subtitle` = 'Dép';
UPDATE `product` SET `subtitle` = 'Boys'' Shoes'                              WHERE `subtitle` = 'Giày bé trai';
UPDATE `product` SET `subtitle` = 'Girls'' Slides'                            WHERE `subtitle` = 'Dép bé gái';
UPDATE `product` SET `subtitle` = 'Men''s Road Running Shoes'                 WHERE `subtitle` = 'Giày chạy bộ nam';
UPDATE `product` SET `subtitle` = 'Men''s Road Racing Shoes'                  WHERE `subtitle` = 'Giày chạy bộ thi đấu nam';
UPDATE `product` SET `subtitle` = 'Women''s Road Running Shoes'               WHERE `subtitle` = 'Giày chạy bộ nữ';
UPDATE `product` SET `subtitle` = 'Women''s Road Racing Shoes'                WHERE `subtitle` = 'Giày chạy bộ thi đấu nữ';
UPDATE `product` SET `subtitle` = 'Men''s Basketball Shoes'                   WHERE `subtitle` = 'Giày bóng rổ nam';
UPDATE `product` SET `subtitle` = 'Basketball Shoes'                          WHERE `subtitle` = 'Giày bóng rổ';
UPDATE `product` SET `subtitle` = 'Boys'' Basketball Shoes'                   WHERE `subtitle` = 'Giày bóng rổ bé trai';
UPDATE `product` SET `subtitle` = 'Girls'' Basketball Shoes'                  WHERE `subtitle` = 'Giày bóng rổ bé gái';
UPDATE `product` SET `subtitle` = 'Men''s Firm-Ground Low-Top Football Boots' WHERE `subtitle` = 'Giày bóng đá sân cỏ tự nhiên nam';
UPDATE `product` SET `subtitle` = 'Men''s Multi-Ground Low-Top Football Boots' WHERE `subtitle` = 'Giày bóng đá nhiều mặt sân nam';

-- Tài khoản test (khớp theo email)
UPDATE `user_app` SET `name` = 'Free Member'     WHERE `email` = 'free@nike.local';
UPDATE `user_app` SET `name` = 'Customer One'    WHERE `email` = 'khach1@nike.local';
UPDATE `user_app` SET `name` = 'Customer Two'    WHERE `email` = 'khach2@nike.local';
UPDATE `user_app` SET `name` = 'No Access Staff' WHERE `email` = 'noaccess@nike.local';

-- Chức vụ (khớp theo tên cũ)
UPDATE `role` SET `name` = 'Administrator' WHERE `name` = 'Quản trị';
UPDATE `role` SET `name` = 'No Access'     WHERE `name` = 'Không quyền';
UPDATE `role` SET `name` = 'Customer'      WHERE `name` = 'Khách hàng';

-- Module / tài nguyên (khớp theo code)
UPDATE `module` SET `name` = 'System', `description` = 'Access control: modules, resources, roles' WHERE `code` = 'SYSTEM';
UPDATE `module` SET `name` = 'Store',  `description` = 'Products and orders of the shoe store'      WHERE `code` = 'CATALOG';

UPDATE `resource` SET `name` = 'Module Management',   `description` = 'Group resources by module'                                WHERE `code` = 'MODULE';
UPDATE `resource` SET `name` = 'Resource Management', `description` = 'Permission-controlled resources (match controller URIs)' WHERE `code` = 'RESOURCE';
UPDATE `resource` SET `name` = 'Role Management',     `description` = 'Roles for admin accounts'                                 WHERE `code` = 'ROLE';
UPDATE `resource` SET `name` = 'Permissions',         `description` = 'Grant actions on resources to each role'                  WHERE `code` = 'PERMISSION';
UPDATE `resource` SET `name` = 'Product Management',  `description` = 'Products, images, sizes and stock'                        WHERE `code` = 'PRODUCT';
