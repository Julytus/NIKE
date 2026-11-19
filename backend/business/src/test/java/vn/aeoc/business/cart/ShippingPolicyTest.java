package vn.aeoc.business.cart;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;

/** Plan gio-hang §9: TC-U3 — phí giao hàng biên. */
class ShippingPolicyTest {
    @ParameterizedTest
    @CsvSource({"0, 0", "1, 30000", "4999999, 30000", "5000000, 0", "5000001, 0"})
    void tcU3FeeAtBoundaries(long subtotal, long expected) {
        assertThat(ShippingPolicy.feeFor(subtotal)).isEqualTo(expected);
    }
}
