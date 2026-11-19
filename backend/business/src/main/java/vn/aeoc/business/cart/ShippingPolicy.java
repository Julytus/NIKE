package vn.aeoc.business.cart;

/**
 * Phí giao hàng (D12, plan gio-hang §5.1): 30.000 ₫, miễn phí khi tạm tính từ 5.000.000 ₫; giỏ không có gì
 * mua được (tạm tính 0) thì phí 0. Lát {@code dat-hang} dùng lại khi tạo đơn.
 */
public final class ShippingPolicy {
    public static final long FREE_SHIPPING_THRESHOLD = 5_000_000L;
    public static final long SHIPPING_FEE = 30_000L;

    private ShippingPolicy() {
    }

    public static long feeFor(long subtotal) {
        if (subtotal <= 0 || subtotal >= FREE_SHIPPING_THRESHOLD) {
            return 0L;
        }
        return SHIPPING_FEE;
    }
}
