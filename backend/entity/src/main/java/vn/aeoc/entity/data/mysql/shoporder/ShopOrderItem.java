package vn.aeoc.entity.data.mysql.shoporder;

import lombok.Data;

/**
 * Một dòng đơn (bảng {@code shop_order_item}, plan dat-hang §4): chụp lại tên / ảnh / size / giá lúc đặt.
 * Trong request chỉ {@code sizeId}, {@code quantity} được đọc; các field khác do server ghi.
 */
@Data
public class ShopOrderItem {
    private Integer id;
    private Integer orderId;
    private Integer sizeId;
    private Integer productId;
    private String productSlug;
    private String productName;
    private String productSubtitle;
    /** "EU 42". */
    private String sizeLabel;
    private String imageUrl;
    /** salePrice ?? price lúc đặt. */
    private Long unitPrice;
    private Integer quantity;
    /** unitPrice × quantity. */
    private Long lineTotal;
}
