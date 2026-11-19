-- Lát dat-hang (plan/dat-hang.md §4): đơn hàng COD.
-- shop_order: một đơn của khách đã đăng nhập; code = 'DH' + yyMMdd + id % 10000 (sinh sau khi có id, nên NULL
-- trong lúc transaction tạo đơn đang chạy). shop_order_item: dòng đơn chụp lại tên / ảnh / size / giá lúc đặt,
-- sửa / ẩn / xoá sản phẩm sau đó không làm đổi đơn (FK sản phẩm / size ON DELETE SET NULL).
-- Không thêm resource: API của khách chỉ cần token (plan §2).

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
