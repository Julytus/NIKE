-- Lát du-lieu-giay (plan/du-lieu-giay.md §4): schema sản phẩm giày + module CATALOG / resource PRODUCT.
-- Chỉ schema: dữ liệu mẫu nạp bằng code từ classpath:seed/giay/products.json (ShoeSeedService),
-- để POST /test-support/reset dùng lại đúng nguồn đó.
SET NAMES utf8mb4;

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

INSERT INTO `module` (`name`, `code`, `description`, `active`)
SELECT 'Cửa hàng', 'CATALOG', 'Sản phẩm, đơn hàng của cửa hàng giày', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `module` WHERE `code` = 'CATALOG');

INSERT INTO `resource` (`name`, `description`, `code`, `uri`, `actions`, `active`, `module_id`)
SELECT 'Quản lý sản phẩm', 'Sản phẩm, ảnh, size và tồn kho', 'PRODUCT', '/product/',
       '["VIEW", "ADD", "UPDATE", "DELETE"]', 1, (SELECT `id` FROM `module` WHERE `code` = 'CATALOG')
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `resource` WHERE `code` = 'PRODUCT');
