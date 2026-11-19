package vn.aeoc.base.constant;

import lombok.Getter;

/**
 * Mã lỗi trả cho client. Message tiếng Anh (frontend hiện nguyên văn) — lát tieng-anh-cua-hang §5.4.
 */
@Getter
public enum ErrorCode {
    UNAUTHORIZED(401, "Invalid or tampered token"),
    TOKEN_EXPIRED(401, "Token has expired"),
    LOGIN(401, "Please sign in"),
    FORBIDDEN(403, "Access denied"),
    LOCK_ACCOUNT(403, "This account has been locked"),
    INTERNAL_ERROR(500, "Something went wrong. Please try again later"),

    DUPLICATED_USER(400, "This phone number is already registered"),
    DUPLICATED_DATA(400, "Duplicate data"),
    INVALID_AUTHENTICATION_INFO(400, "Incorrect email or password."),
    DUPLICATED_EMAIL(400, "This email already exists"),
    EMAIL_EXISTS(400, "This email is already registered."),
    UPLOAD_FILE_FAILED(400, "File upload failed"),
    FILE_EMPTY(400, "File is empty"),
    FILE_TOO_LARGE(413, "File exceeds the allowed size"),
    FILE_TYPE_NOT_ALLOWED(415, "File type not supported"),

    VERSION_CONFLICT(409, "This data has changed. Please reload and try again"),

    WRONG_LOGIN_INFO(400, "Incorrect sign-in details. Please check your email and password."),
    MISSING_PASSWORD(400, "Please enter your password."),
    MISSING_EMAIL_OR_PHONE(400, "Please enter your email."),
    WEAK_PASSWORD(400, "Password must be 8 to 72 characters."),
    REFRESH_TOKEN_INVALID(401, "Your session has expired. Please sign in again."),
    LOGIN_TOO_MANY_ATTEMPTS(429, "Too many failed sign-in attempts. Please try again in a few minutes."),
    REGISTRATION_DISABLED(403, "Registration is not available"),
    DATA_NOT_FOUND(404, "Not found"),
    METHOD_NOT_ALLOWED(405, "HTTP method not supported"),
    DEFAULT_ROLE_NOT_FOUND(404, "Default role not found"),
    LOCK_STATUS(401, "This account is inactive"),
    BAD_REQUEST(400, "Invalid request"),
    BAD_REQUEST_AI(400, "Invalid request"),
    EXIST_VOUCHER(400, "Voucher code already exists"),
    INVALID_ORDER_STATUS(400, "Invalid order status"),
    INVALID_PAYMENT_STATUS(400, "Invalid payment status"),
    ORDER_ALREADY_FINISHED(400, "This order is already completed and can't be changed"),
    INPUT_WRONG(400, "Invalid data"),
    INVOICE_FILE_NOT_ISSUED(400, "Only issued invoices have a file to view"),
    INVOICE_EMAIL_NOT_ACTIVE(400, "Only valid issued invoices can be emailed"),
    INVOICE_EMAIL_MISSING(400, "Recipient email is missing"),
    INVOICE_EMAIL_FAILED(503, "Couldn't send the email. Please try again later"),
    INVOICE_FILE_FAILED(503, "Couldn't create the invoice file. Please try again later"),
    INVOICE_LOOKUP_NOT_FOUND(404, "Invoice not found. Check the seller tax code and lookup code"),
    INVOICE_LOOKUP_BLOCKED(429, "Too many failed lookups. Please try again in 10 minutes"),
    INVOICE_FILE_TOKEN_INVALID(404, "The invoice download link is invalid or has expired"),
    ORDER_INVALID_STATUS(400, "This order has already been processed"),
    PAYMENT_GATEWAY_ERROR(502, "Couldn't reach the payment gateway. Please try again"),
    INVALID_SIGNATURE(400, "Invalid signature");

    public final int code;
    public final String message;

    ErrorCode(int code, String message) {
        this.code = code;
        this.message = message;
    }
}
