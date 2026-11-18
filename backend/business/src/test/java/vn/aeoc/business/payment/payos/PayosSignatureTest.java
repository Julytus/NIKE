package vn.aeoc.business.payment.payos;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** TC-U1 (plan go-lut §9): chữ ký payOS vẫn đúng sau khi chuyển sang {@code business.payment.payos}. */
class PayosSignatureTest {
    private static final String KEY = "test-key";
    private static final String RAW = "amount=2499000&cancelUrl=http://localhost:4500/huy"
            + "&description=DH2611180001&orderCode=1001&returnUrl=http://localhost:4500/ok";

    /** HMAC-SHA256 hex tính độc lập với code đang kiểm. */
    private static String expectedHmac(String data) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(KEY.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
    }

    private static ObjectNode sample() {
        // Cố tình chèn khoá lộn thứ tự: chữ ký phải sắp xếp theo khoá
        ObjectNode data = new ObjectMapper().createObjectNode();
        data.put("orderCode", 1001);
        data.put("returnUrl", "http://localhost:4500/ok");
        data.put("amount", 2499000);
        data.put("description", "DH2611180001");
        data.put("cancelUrl", "http://localhost:4500/huy");
        return data;
    }

    @Test
    void signCreate_matchesHmacOfSortedQueryString() throws Exception {
        String signature = PayosSignature.signCreate(2499000, "http://localhost:4500/huy", "DH2611180001",
                1001, "http://localhost:4500/ok", KEY);

        assertEquals(expectedHmac(RAW), signature);
    }

    @Test
    void signData_sortsKeys_sameAsSignCreate() throws Exception {
        assertEquals(expectedHmac(RAW), PayosSignature.signData(sample(), KEY));
    }

    @Test
    void verify_acceptsCorrectSignature_rejectsOneCharChanged() throws Exception {
        String signature = expectedHmac(RAW);
        char last = signature.charAt(signature.length() - 1);
        String tampered = signature.substring(0, signature.length() - 1) + (last == '0' ? '1' : '0');

        assertTrue(PayosSignature.verify(sample(), signature, KEY));
        assertFalse(PayosSignature.verify(sample(), tampered, KEY));
    }
}
