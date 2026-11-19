package vn.aeoc.entity.data.mysql.shoporder;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Đơn hàng của khách (bảng {@code shop_order}, plan dat-hang §4). Dùng làm body của {@code POST /shop-order/create}
 * (chỉ đọc thông tin giao hàng, {@code paymentMethod}, {@code items}) và làm response của create / get.
 */
@Data
public class ShopOrder {
    public static final String STATUS_PLACED = "PLACED";
    public static final String PAYMENT_COD = "COD";

    private Integer id;
    /** "DH" + yyMMdd + id % 10000; NULL chỉ trong lúc transaction tạo đơn đang chạy. */
    private String code;
    private Integer userId;
    private String receiverName;
    private String phone;
    private String address;
    private String note;
    /** Σ quantity. */
    private Integer itemCount;
    /** Σ lineTotal. */
    private Long subtotal;
    private Long shippingFee;
    /** subtotal + shippingFee. */
    private Long total;
    private String paymentMethod;
    private String status;
    private LocalDateTime createdTime;
    private LocalDateTime updatedTime;

    /** Dòng đơn theo thứ tự đặt — không phải cột (request: chỉ đọc sizeId, quantity). */
    private List<ShopOrderItem> items;
}
