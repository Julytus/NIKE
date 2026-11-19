package vn.aeoc.entity.data.mysql.cart;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Một dòng giỏ hàng client gửi lên {@code POST /cart/public/check} (plan gio-hang §5.1).
 * Không phải bảng: giỏ lưu ở localStorage (D8). Field lạ (vd {@code price}) bị Jackson bỏ qua.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CartItem {
    private Integer sizeId;
    private Integer quantity;
}
