package vn.aeoc.entity.data.mysql.product;

import lombok.Data;

@Data
public class ProductCategory {
    private Integer id;
    private String slug;
    private String name;
    private Integer sortOrder;

    /** Không phải cột: số sản phẩm PUBLISHED thuộc danh mục. */
    private Integer productCount;
    /** Không phải cột: ảnh số 1 của sản phẩm PUBLISHED mới nhất trong danh mục (null nếu không có). */
    private String imageUrl;
}
