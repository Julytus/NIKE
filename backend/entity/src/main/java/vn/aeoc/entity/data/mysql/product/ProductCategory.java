package vn.aeoc.entity.data.mysql.product;

import lombok.Data;

@Data
public class ProductCategory {
    private Integer id;
    private String slug;
    private String name;
    private Integer sortOrder;
}
