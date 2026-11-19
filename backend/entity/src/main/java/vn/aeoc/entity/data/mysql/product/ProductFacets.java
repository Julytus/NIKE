package vn.aeoc.entity.data.mysql.product;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Số sản phẩm theo từng lựa chọn lọc (plan danh-sach-giay §5.2). Khoá map = giá trị URL ({@code men},
 * {@code under-1m}, {@code just-in}…), luôn đủ khoá theo thứ tự hiển thị ({@code LinkedHashMap}).
 */
@Data
public class ProductFacets {
    private Map<String, Integer> gender;
    private Map<String, Integer> kids;
    private Map<String, Integer> price;
    private Integer sale;
    private Map<String, Integer> badge;
    /** Mọi size của sản phẩm đang bán, tăng dần. */
    private List<SizeCount> size;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SizeCount {
        /** Số EU, vd 42.0, 40.5. */
        private BigDecimal value;
        /** "EU 42", "EU 40.5" (không có ".0"). */
        private String label;
        /** Số sản phẩm khớp các nhóm lọc khác còn hàng ở size này. */
        private Integer count;
    }
}
