package vn.aeoc.business.product.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.aeoc.base.exception.AppException;
import vn.aeoc.base.util.QueryExecutor;
import vn.aeoc.business.product.repository.ProductSizeRepository;
import vn.aeoc.entity.data.mysql.product.ProductSize;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Plan dat-hang §9: TC-U7 ({@code setStock}) + {@code decrease}. */
class ProductStockServiceTest {
    private ProductSizeRepository repository;
    private ProductStockService service;

    @BeforeEach
    void setUp() {
        repository = mock(ProductSizeRepository.class);
        service = new ProductStockService(repository, new QueryExecutor(Runnable::run));
    }

    private static ProductSize size(Integer id, Integer stock) {
        ProductSize size = new ProductSize();
        size.setId(id);
        size.setStock(stock);
        return size;
    }

    private void assertError(ProductSize request, int status, String message) {
        assertThatThrownBy(() -> service.setStock(request))
                .isInstanceOf(AppException.class)
                .hasMessage(message)
                .satisfies(e -> assertThat(((AppException) e).getStatusCode()).isEqualTo(status));
    }

    @Test
    void tcU7_setStock() {
        when(repository.getById(2409)).thenReturn(size(2409, 7));

        assertError(size(999999, 5), 404, "Not found");
        assertError(size(2409, -1), 400, "Stock must be 0 or more.");
        assertError(size(2409, null), 400, "Stock must be 0 or more.");
        verify(repository, never()).updateStock(any(), any());

        ProductSize result = service.setStock(size(2409, 7));
        verify(repository).updateStock(2409, 7);
        assertThat(result.getStock()).isEqualTo(7);
    }

    @Test
    void decrease_traVeTheoSoDongCapNhat() {
        when(repository.decreaseStock(2409, 2)).thenReturn(1);
        when(repository.decreaseStock(1306, 1)).thenReturn(0);

        assertThat(service.decrease(2409, 2)).isTrue();
        assertThat(service.decrease(1306, 1)).isFalse();
    }
}
