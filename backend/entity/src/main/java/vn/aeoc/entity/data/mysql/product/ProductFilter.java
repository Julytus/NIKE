package vn.aeoc.entity.data.mysql.product;

import lombok.Data;

/**
 * Tham số lọc của trang danh sách giày (plan danh-sach-giay §5.0), nhận thẳng từ query string.
 * Khoá và giá trị trùng hợp đồng URL {@code /w}; nhiều giá trị ngăn dấu phẩy (vd {@code gender=men,women}).
 * Chuỗi thô — service chuẩn hoá và bỏ giá trị không nhận ra.
 */
@Data
public class ProductFilter {
    /** Slug danh mục: lifestyle, running, basketball, jordan, football. */
    private String category;
    /** men, women, unisex. */
    private String gender;
    /** boys, girls (cùng nhóm với gender trên cột product.gender). */
    private String kids;
    /** under-1m, 1m-2m, 2m-5m, 5m-plus. */
    private String price;
    /** "1" = đang giảm giá. */
    private String sale;
    /** just-in, bestseller. */
    private String badge;
    /** Số EU, vd 42, 40.5. */
    private String size;
    /** Từ khoá: tên / phụ đề / mã chứa q. */
    private String q;
    /** featured (mặc định), newest, price-desc, price-asc — chỉ dùng cho list. */
    private String sort;
}
