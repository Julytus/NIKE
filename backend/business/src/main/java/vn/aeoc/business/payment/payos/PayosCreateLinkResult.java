package vn.aeoc.business.payment.payos;

/** Kết quả tạo link payOS: URL trang thanh toán và id link. */
public record PayosCreateLinkResult(String checkoutUrl, String paymentLinkId) {}
