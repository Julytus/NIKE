package vn.aeoc.entity.data.mysql.cart;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Kết quả {@code POST /cart/public/check} (plan gio-hang §5.1): các dòng theo đúng thứ tự request + tổng.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CartCheck {
    private List<CartLine> items;
    /** Σ availableQuantity. */
    private int itemCount;
    /** Σ lineTotal. */
    private long subtotal;
    private long shippingFee;
    /** subtotal + shippingFee. */
    private long total;
}
