package vn.aeoc.business.payment.payos;

import java.util.List;

/**
 * Dữ liệu tạo link thanh toán payOS (độc lập với loại đơn — lát `dat-hang` map đơn giày sang đây).
 *
 * @param expiredAt thời điểm hết hạn link (epoch giây)
 */
public record PayosCreateLinkRequest(long orderCode, long amount, String description,
                                     String returnUrl, String cancelUrl, long expiredAt,
                                     List<Item> items) {
    public record Item(String name, int quantity, long price) {}
}
