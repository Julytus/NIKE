package vn.aeoc.entity.data.mysql.product;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

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

    /** Không phải cột: 5 ảnh theo sort_order — chỉ có ở {@code /product/public/get} (plan chi-tiet-giay §5.1). */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private List<ProductImage> images;
    /** Không phải cột: lưới size theo size_value tăng dần, kèm tồn kho — chỉ có ở {@code /product/public/get}. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private List<ProductSize> sizes;
}
