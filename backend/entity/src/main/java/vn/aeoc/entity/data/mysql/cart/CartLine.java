package vn.aeoc.entity.data.mysql.cart;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;

/**
 * Một dòng kết quả của {@code POST /cart/public/check} (plan gio-hang §5.1): thông tin hiển thị + giá / tồn kho
 * mới nhất từ DB và trạng thái mua được. Repository đổ các cột {@code product_size ⨝ product} vào đây;
 * service điền {@code quantity}, {@code status}, {@code availableQuantity}, {@code unitPrice}, {@code lineTotal}.
 */
@Data
public class CartLine {
    public static final String AVAILABLE = "AVAILABLE";
    public static final String INSUFFICIENT_STOCK = "INSUFFICIENT_STOCK";
    public static final String OUT_OF_STOCK = "OUT_OF_STOCK";
    public static final String UNAVAILABLE = "UNAVAILABLE";

    private Integer sizeId;
    private Integer quantity;
    /** AVAILABLE · INSUFFICIENT_STOCK · OUT_OF_STOCK · UNAVAILABLE. */
    private String status;
    private Integer availableQuantity;
    private Integer stock;
    private Integer productId;
    private String slug;
    private String name;
    private String subtitle;
    private String imageUrl;
    private String sizeLabel;
    private Long price;
    private Long salePrice;
    /** {@code salePrice ?? price}. */
    private Long unitPrice;
    /** {@code unitPrice × availableQuantity}. */
    private Long lineTotal;

    /** Trạng thái sản phẩm trong DB (PUBLISHED / HIDDEN / DRAFT) — chỉ dùng nội bộ để xét UNAVAILABLE. */
    @JsonIgnore
    private String productStatus;
}
