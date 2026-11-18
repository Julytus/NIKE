package vn.aeoc.entity.data.mysql.product;

import lombok.Data;

@Data
public class ProductImage {
    private Integer id;
    private Integer productId;
    private String url;
    private Integer sortOrder;
}
