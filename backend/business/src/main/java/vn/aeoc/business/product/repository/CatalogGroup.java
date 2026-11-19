package vn.aeoc.business.product.repository;

/**
 * Nhóm lọc của danh sách giày (plan danh-sach-giay §5.2). Đếm facets của một nhóm thì bỏ điều kiện
 * của chính nhóm đó. {@code GENDER} gồm cả {@code gender} lẫn {@code kids} (cùng cột {@code product.gender}).
 */
public enum CatalogGroup {
    GENDER, PRICE, SALE, BADGE, SIZE
}
