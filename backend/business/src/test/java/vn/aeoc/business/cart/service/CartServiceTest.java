package vn.aeoc.business.cart.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.aeoc.base.exception.AppException;
import vn.aeoc.base.util.QueryExecutor;
import vn.aeoc.business.product.repository.ProductSizeRepository;
import vn.aeoc.entity.data.mysql.cart.CartCheck;
import vn.aeoc.entity.data.mysql.cart.CartItem;
import vn.aeoc.entity.data.mysql.cart.CartLine;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** Plan gio-hang §9: TC-U1 (validate), TC-U2 (dựng dòng + tổng). */
class CartServiceTest {
    private ProductSizeRepository repository;
    private CartService service;

    @BeforeEach
    void setUp() {
        repository = mock(ProductSizeRepository.class);
        service = new CartService(repository, new QueryExecutor(Runnable::run));
    }

    private static CartItem item(Integer sizeId, Integer quantity) {
        return new CartItem(sizeId, quantity);
    }

    private static CartLine row(int sizeId, int productId, String slug, int stock, String status,
                                long price, Long salePrice) {
        CartLine row = new CartLine();
        row.setSizeId(sizeId);
        row.setProductId(productId);
        row.setSlug(slug);
        row.setName("Name " + slug);
        row.setSubtitle("Men's Shoes");
        row.setImageUrl("http://minio/products/" + slug + "/1.webp");
        row.setSizeLabel("EU 42");
        row.setStock(stock);
        row.setProductStatus(status);
        row.setPrice(price);
        row.setSalePrice(salePrice);
        return row;
    }

    private void assertBadRequest(List<CartItem> items, String message) {
        assertThatThrownBy(() -> service.check(items))
                .isInstanceOf(AppException.class)
                .hasMessage(message)
                .satisfies(e -> assertThat(((AppException) e).getStatusCode()).isEqualTo(400));
    }

    @Test
    void tcU1ValidatesBeforeQueryingDatabase() {
        List<CartItem> tooMany = IntStream.rangeClosed(1, 51).mapToObj(i -> item(i, 1)).toList();
        assertBadRequest(tooMany, CartService.TOO_MANY_LINES);
        assertBadRequest(new ArrayList<>(Arrays.asList((CartItem) null)), CartService.INVALID_SIZE);
        assertBadRequest(List.of(item(0, 1)), CartService.INVALID_SIZE);
        assertBadRequest(List.of(item(206, null)), CartService.INVALID_QUANTITY);
        assertBadRequest(List.of(item(206, 11)), CartService.INVALID_QUANTITY);
        assertBadRequest(List.of(item(206, 1), item(206, 1)), CartService.DUPLICATE_SIZE);
        // Lỗi đầu tiên thắng: dòng 1 sai số lượng trước dòng 2 sai size
        assertBadRequest(List.of(item(206, 11), item(0, 1)), CartService.INVALID_QUANTITY);

        assertThat(CartService.TOO_MANY_LINES).isEqualTo("Your bag can hold up to 50 different items.");
        assertThat(CartService.INVALID_SIZE).isEqualTo("Invalid size in bag.");
        assertThat(CartService.INVALID_QUANTITY).isEqualTo("Quantity must be between 1 and 10.");
        assertThat(CartService.DUPLICATE_SIZE).isEqualTo("Each size can only appear once in the bag.");
        verifyNoInteractions(repository);
    }

    @Test
    void tcU1AcceptsBoundaryValues() {
        when(repository.listCartRows(any())).thenReturn(List.of());
        List<CartItem> fifty = IntStream.rangeClosed(1, 50).mapToObj(i -> item(i, 10)).toList();

        assertThat(service.check(fifty).getItems()).hasSize(50);
        assertThat(service.check(List.of(item(206, 1))).getItems()).hasSize(1);
    }

    @Test
    void tcU2BuildsLinesInRequestOrderWithTotals() {
        // Repository trả thứ tự khác request
        when(repository.listCartRows(List.of(206, 201, 3106, 999999, 1805))).thenReturn(List.of(
                row(1805, 18, "nike-vaporfly-4", 3, "PUBLISHED", 6_609_000L, null),
                row(3106, 31, "nike-air-max-plus-premium", 20, "HIDDEN", 5_279_000L, null),
                row(201, 2, "nike-dunk-low-retro", 0, "PUBLISHED", 3_519_000L, null),
                row(206, 2, "nike-dunk-low-retro", 20, "PUBLISHED", 3_519_000L, null)));

        CartCheck result = service.check(List.of(
                item(206, 2), item(201, 1), item(3106, 1), item(999999, 1), item(1805, 5)));

        List<CartLine> lines = result.getItems();
        assertThat(lines).extracting(CartLine::getSizeId).containsExactly(206, 201, 3106, 999999, 1805);
        assertThat(lines).extracting(CartLine::getStatus).containsExactly(
                CartLine.AVAILABLE, CartLine.OUT_OF_STOCK, CartLine.UNAVAILABLE, CartLine.UNAVAILABLE,
                CartLine.INSUFFICIENT_STOCK);
        assertThat(lines).extracting(CartLine::getAvailableQuantity).containsExactly(2, 0, 0, 0, 3);
        assertThat(lines).extracting(CartLine::getQuantity).containsExactly(2, 1, 1, 1, 5);
        assertThat(lines).extracting(CartLine::getLineTotal)
                .containsExactly(7_038_000L, 0L, 0L, 0L, 19_827_000L);

        CartLine hidden = lines.get(2);
        assertThat(hidden.getStock()).isZero();
        assertThat(hidden.getName()).isEqualTo("Name nike-air-max-plus-premium");
        assertThat(hidden.getUnitPrice()).isEqualTo(5_279_000L);

        CartLine missing = lines.get(3);
        assertThat(missing.getProductId()).isNull();
        assertThat(missing.getSlug()).isNull();
        assertThat(missing.getName()).isNull();
        assertThat(missing.getSubtitle()).isNull();
        assertThat(missing.getImageUrl()).isNull();
        assertThat(missing.getSizeLabel()).isNull();
        assertThat(missing.getPrice()).isNull();
        assertThat(missing.getSalePrice()).isNull();
        assertThat(missing.getUnitPrice()).isNull();
        assertThat(missing.getStock()).isZero();

        assertThat(lines.get(4).getStock()).isEqualTo(3);
        assertThat(result.getItemCount()).isEqualTo(5);
        assertThat(result.getSubtotal()).isEqualTo(26_865_000L);
        assertThat(result.getShippingFee()).isZero();
        assertThat(result.getTotal()).isEqualTo(26_865_000L);
        verify(repository, times(1)).listCartRows(any());
    }

    @Test
    void tcU2UsesSalePriceFromDatabase() {
        when(repository.listCartRows(List.of(1906))).thenReturn(List.of(
                row(1906, 19, "nike-precision-8-low", 20, "PUBLISHED", 2_119_000L, 2_000_000L)));

        CartCheck result = service.check(List.of(item(1906, 2)));

        assertThat(result.getItems().get(0).getUnitPrice()).isEqualTo(2_000_000L);
        assertThat(result.getSubtotal()).isEqualTo(4_000_000L);
        assertThat(result.getShippingFee()).isEqualTo(30_000L);
        assertThat(result.getTotal()).isEqualTo(4_030_000L);
    }

    @Test
    void tcU2EmptyCartSkipsQuery() {
        CartCheck result = service.check(List.of());

        assertThat(result.getItems()).isEmpty();
        assertThat(result.getItemCount()).isZero();
        assertThat(result.getSubtotal()).isZero();
        assertThat(result.getShippingFee()).isZero();
        assertThat(result.getTotal()).isZero();
        verify(repository, never()).listCartRows(any());
    }
}
