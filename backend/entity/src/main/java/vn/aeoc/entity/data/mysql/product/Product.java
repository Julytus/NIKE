package vn.aeoc.entity.data.mysql.product;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class Product {
    private Integer id;
    private String slug;
    private String styleCode;
    private String name;
    private String subtitle;
    /** MEN / WOMEN / UNISEX / BOYS / GIRLS */
    private String gender;
    private Integer categoryId;
    private String description;
    /** VNĐ, giá gốc. */
    private Long price;
    /** VNĐ, giá giảm (null = không giảm, luôn nhỏ hơn price). */
    private Long salePrice;
    /** JUST_IN / BESTSELLER / null */
    private String badge;
    /** DRAFT / PUBLISHED / HIDDEN */
    private String status;
    private LocalDateTime createdTime;
    private LocalDateTime updatedTime;

    /** Không phải cột: URL ảnh số 1 (product_image.sort_order = 1), lấy bằng subquery. */
    private String imageUrl;
    /** Không phải cột: tổng tồn kho mọi size (COALESCE(SUM(product_size.stock), 0)). */
    private Integer totalStock;
}
