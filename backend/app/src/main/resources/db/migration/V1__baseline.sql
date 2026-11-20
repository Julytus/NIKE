-- =====================================================================
-- V1 baseline (gộp migration 20/11/2026): schema cửa hàng giày ở trạng thái hiện tại.
-- Thay cho chuỗi V1 → V21 cũ (gồm phần cửa hàng LUT đã gỡ). DB tạo trước ngày gộp phải xoá volume
-- MySQL rồi tạo lại (README §Chạy local).
--   Đăng nhập + phân quyền: module, resource, role, permission, user_app, refresh_token
--   Cửa hàng giày:          product_category, product, product_image, product_size
--   Đơn hàng COD:           shop_order, shop_order_item
-- Dữ liệu giày KHÔNG nằm ở migration: ShoeSeedRunner nạp từ classpath:seed/giay/products.json khi DB trống,
-- POST /test-support/reset dùng lại đúng nguồn đó. Tài khoản mẫu ở db/seed (chỉ profile local).
-- KHÔNG sửa file migration đã chạy — đổi schema bằng file V<n+1>__<mô_tả>.sql mới.
-- =====================================================================
SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- Đăng nhập + phân quyền (một cửa hàng duy nhất: không có bảng branch / cột bsn_id)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `module` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(300) DEFAULT NULL,
  `code` varchar(100) DEFAULT NULL,
  `description` varchar(300) DEFAULT NULL,
  `active` int DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `module_code_uindex` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Tài nguyên được phân quyền; `uri` khớp hằng URI trong controller (vd '/product/')
CREATE TABLE IF NOT EXISTS `resource` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(300) DEFAULT NULL,
  `description` varchar(300) DEFAULT NULL,
  `code` varchar(100) DEFAULT NULL,
  `uri` varchar(300) DEFAULT NULL,
  `actions` json DEFAULT NULL,
  `active` int DEFAULT '1',
  `module_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `resource_code_uindex` (`code`),
  KEY `resource_uri_index` (`uri`),
  CONSTRAINT `resource_module_fk` FOREIGN KEY (`module_id`) REFERENCES `module` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- is_operator = 1: bỏ qua kiểm tra permission (toàn quyền); is_default = 1: role gán khi khách tự đăng ký
CREATE TABLE IF NOT EXISTS `role` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `is_default` int DEFAULT '0',
  `is_operator` int DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_name_uindex` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- actions: mảng JSON con của resource.actions, vd ["VIEW","ADD"]
CREATE TABLE IF NOT EXISTS `permission` (
  `id` int NOT NULL AUTO_INCREMENT,
  `resource_id` int NOT NULL,
  `role_id` int NOT NULL,
  `actions` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permission_role_resource_uindex` (`role_id`,`resource_id`),
  CONSTRAINT `permission_role_fk` FOREIGN KEY (`role_id`) REFERENCES `role` (`id`) ON DELETE CASCADE,
  CONSTRAINT `permission_resource_fk` FOREIGN KEY (`resource_id`) REFERENCES `resource` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `user_app` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `alias` varchar(255) DEFAULT NULL,
  `avatar` text,
  `phone` varchar(20) DEFAULT NULL,
  `phone_verified` int DEFAULT '0',
  `email` varchar(255) DEFAULT NULL,
  `facebook_id` varchar(255) DEFAULT NULL,
  `gplus_id` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `has_password` int DEFAULT '0',
  `regis_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `gender` int DEFAULT NULL,
  `city_name` varchar(255) DEFAULT NULL,
  `subdistrict_name` varchar(255) DEFAULT NULL,
  `role_id` int DEFAULT NULL,
  `active` int DEFAULT '1',
  `first_time` int DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_app_phone_uindex` (`phone`),
  UNIQUE KEY `user_app_email_uindex` (`email`),
  KEY `user_app_role_index` (`role_id`),
  CONSTRAINT `user_app_role_fk` FOREIGN KEY (`role_id`) REFERENCES `role` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `refresh_token` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `token_hash` char(64) NOT NULL,
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `refresh_token_hash_uindex` (`token_hash`),
  KEY `refresh_token_user_index` (`user_id`),
  CONSTRAINT `refresh_token_user_fk` FOREIGN KEY (`user_id`) REFERENCES `user_app` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Cửa hàng giày (plan/du-lieu-giay.md §4)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_category (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT uk_product_category_slug UNIQUE (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS product (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(150) NOT NULL,
  style_code VARCHAR(30) NOT NULL,
  name VARCHAR(200) NOT NULL,
  subtitle VARCHAR(100) NOT NULL,
  gender VARCHAR(10) NOT NULL,
  category_id INT NOT NULL,
  description TEXT NOT NULL,
  price BIGINT NOT NULL,
  sale_price BIGINT NULL,
  badge VARCHAR(20) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  created_time DATETIME NOT NULL,
  updated_time DATETIME NOT NULL,
  CONSTRAINT uk_product_slug UNIQUE (slug),
  CONSTRAINT uk_product_style_code UNIQUE (style_code),
  CONSTRAINT fk_product_category FOREIGN KEY (category_id) REFERENCES product_category(id) ON DELETE RESTRICT,
  CONSTRAINT ck_product_sale_price CHECK (sale_price IS NULL OR sale_price < price),
  KEY idx_product_category (category_id),
  KEY idx_product_status_gender (status, gender)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS product_image (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  url VARCHAR(500) NOT NULL,
  sort_order TINYINT NOT NULL,
  CONSTRAINT uk_product_image_sort UNIQUE (product_id, sort_order),
  CONSTRAINT fk_product_image_product FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS product_size (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  size_label VARCHAR(20) NOT NULL,
  size_value DECIMAL(4,1) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  CONSTRAINT uk_product_size_label UNIQUE (product_id, size_label),
  CONSTRAINT fk_product_size_product FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE CASCADE,
  CONSTRAINT ck_product_size_stock CHECK (stock >= 0),
  KEY idx_product_size_value (product_id, size_value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Đơn hàng COD (plan/dat-hang.md §4)
-- shop_order: một đơn của khách đã đăng nhập; code = 'DH' + yyMMdd + id % 10000 (sinh sau khi có id, nên NULL
-- trong lúc transaction tạo đơn đang chạy). shop_order_item: dòng đơn chụp lại tên / ảnh / size / giá lúc đặt,
-- sửa / ẩn / xoá sản phẩm sau đó không làm đổi đơn (FK sản phẩm / size ON DELETE SET NULL).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `shop_order` (
    `id`             INT          NOT NULL AUTO_INCREMENT,
    `code`           VARCHAR(20)  NULL,
    `user_id`        INT          NOT NULL,
    `receiver_name`  VARCHAR(100) NOT NULL,
    `phone`          VARCHAR(20)  NOT NULL,
    `address`        VARCHAR(255) NOT NULL,
    `note`           VARCHAR(255) NULL,
    `item_count`     INT          NOT NULL,
    `subtotal`       BIGINT       NOT NULL,
    `shipping_fee`   BIGINT       NOT NULL,
    `total`          BIGINT       NOT NULL,
    `payment_method` VARCHAR(10)  NOT NULL,
    `status`         VARCHAR(20)  NOT NULL,
    `created_time`   DATETIME     NOT NULL,
    `updated_time`   DATETIME     NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_shop_order_code` (`code`),
    KEY `idx_shop_order_user` (`user_id`, `created_time`),
    CONSTRAINT `fk_shop_order_user` FOREIGN KEY (`user_id`) REFERENCES `user_app` (`id`) ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `shop_order_item` (
    `id`               INT          NOT NULL AUTO_INCREMENT,
    `order_id`         INT          NOT NULL,
    `size_id`          INT          NULL,
    `product_id`       INT          NULL,
    `product_slug`     VARCHAR(150) NOT NULL,
    `product_name`     VARCHAR(200) NOT NULL,
    `product_subtitle` VARCHAR(100) NOT NULL,
    `size_label`       VARCHAR(20)  NOT NULL,
    `image_url`        VARCHAR(500) NULL,
    `unit_price`       BIGINT       NOT NULL,
    `quantity`         INT          NOT NULL,
    `line_total`       BIGINT       NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_shop_order_item_order` (`order_id`),
    CONSTRAINT `fk_shop_order_item_order` FOREIGN KEY (`order_id`) REFERENCES `shop_order` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_shop_order_item_size` FOREIGN KEY (`size_id`) REFERENCES `product_size` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_shop_order_item_product` FOREIGN KEY (`product_id`) REFERENCES `product` (`id`) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Dữ liệu tham chiếu mọi môi trường: module, tài nguyên phân quyền, role khách hàng.
-- Không ghi cứng id module / resource (code tra theo `code`); chạy lại không bị trùng.
-- ---------------------------------------------------------------------
INSERT INTO `module` (`name`, `code`, `description`, `active`)
SELECT 'System', 'SYSTEM', 'Access control: modules, resources, roles', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `module` WHERE `code` = 'SYSTEM');

INSERT INTO `module` (`name`, `code`, `description`, `active`)
SELECT 'Store', 'CATALOG', 'Products and orders of the shoe store', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `module` WHERE `code` = 'CATALOG');

INSERT INTO `resource` (`name`, `description`, `code`, `uri`, `actions`, `active`, `module_id`)
SELECT 'Module Management', 'Group resources by module', 'MODULE', '/module/',
       '["VIEW", "ADD", "UPDATE", "DELETE"]', 1, (SELECT `id` FROM `module` WHERE `code` = 'SYSTEM')
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `resource` WHERE `code` = 'MODULE');

INSERT INTO `resource` (`name`, `description`, `code`, `uri`, `actions`, `active`, `module_id`)
SELECT 'Resource Management', 'Permission-controlled resources (match controller URIs)', 'RESOURCE', '/resource/',
       '["VIEW", "ADD", "UPDATE", "DELETE"]', 1, (SELECT `id` FROM `module` WHERE `code` = 'SYSTEM')
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `resource` WHERE `code` = 'RESOURCE');

INSERT INTO `resource` (`name`, `description`, `code`, `uri`, `actions`, `active`, `module_id`)
SELECT 'Role Management', 'Roles for admin accounts', 'ROLE', '/role/',
       '["VIEW", "ADD", "UPDATE", "DELETE"]', 1, (SELECT `id` FROM `module` WHERE `code` = 'SYSTEM')
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `resource` WHERE `code` = 'ROLE');

INSERT INTO `resource` (`name`, `description`, `code`, `uri`, `actions`, `active`, `module_id`)
SELECT 'Permissions', 'Grant actions on resources to each role', 'PERMISSION', '/permission/',
       '["VIEW", "UPDATE"]', 1, (SELECT `id` FROM `module` WHERE `code` = 'SYSTEM')
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `resource` WHERE `code` = 'PERMISSION');

INSERT INTO `resource` (`name`, `description`, `code`, `uri`, `actions`, `active`, `module_id`)
SELECT 'Product Management', 'Products, images, sizes and stock', 'PRODUCT', '/product/',
       '["VIEW", "ADD", "UPDATE", "DELETE"]', 1, (SELECT `id` FROM `module` WHERE `code` = 'CATALOG')
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `resource` WHERE `code` = 'PRODUCT');

-- Role khách hàng là role mặc định duy nhất (gán khi khách tự đăng ký). id 3 giữ như trước khi gộp:
-- local seed V1_1 tạo thêm Administrator (1) và No Access (2).
INSERT INTO `role` (`id`, `name`, `is_default`, `is_operator`)
SELECT 3, 'Customer', 1, 0 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `role` WHERE `name` = 'Customer');
