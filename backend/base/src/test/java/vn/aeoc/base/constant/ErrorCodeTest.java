package vn.aeoc.base.constant;

import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

/** TC-U1 (plan tieng-anh-cua-hang §9): message của ErrorCode trả cho client không còn chữ có dấu tiếng Việt. */
class ErrorCodeTest {
    /** Nguyên âm có dấu + "đ" (không gồm ký hiệu tiền ₫). */
    static final Pattern VIETNAMESE = Pattern.compile(
            "[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);

    @Test
    void tcU1_khongConTiengViet() {
        List<String> vietnamese = Arrays.stream(ErrorCode.values())
                .filter(e -> VIETNAMESE.matcher(e.message).find())
                .map(e -> e.name() + ": " + e.message)
                .toList();
        assertEquals(List.of(), vietnamese);
    }

    @Test
    void tcU1_moiMessageKhongRong() {
        for (ErrorCode e : ErrorCode.values()) {
            assertFalse(e.message == null || e.message.isBlank(), e.name());
        }
    }

    @Test
    void tcU1_mauMessageTheoPlan() {
        assertEquals("Please sign in", ErrorCode.LOGIN.message);
        assertEquals("Invalid or tampered token", ErrorCode.UNAUTHORIZED.message);
        assertEquals("Incorrect email or password.", ErrorCode.INVALID_AUTHENTICATION_INFO.message);
        assertEquals("This email is already registered.", ErrorCode.EMAIL_EXISTS.message);
        assertEquals("Not found", ErrorCode.DATA_NOT_FOUND.message);
        assertEquals("HTTP method not supported", ErrorCode.METHOD_NOT_ALLOWED.message);
        assertEquals(405, ErrorCode.METHOD_NOT_ALLOWED.code);
    }
}
