package vn.aeoc.entity.data.mysql.product;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class ProductSize {
    private Integer id;
    private Integer productId;
    /** "EU 40.5", "EU 42" (không ghi ".0"). */
    private String sizeLabel;
    private BigDecimal sizeValue;
    private Integer stock;
}
