package vn.aeoc.business.product.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import vn.aeoc.base.exception.AppException;
import vn.aeoc.base.util.QueryExecutor;
import vn.aeoc.business.product.repository.ProductImageRepository;
import vn.aeoc.business.product.repository.ProductRepository;
import vn.aeoc.business.product.repository.ProductSizeRepository;
import vn.aeoc.entity.data.mysql.product.Product;
import vn.aeoc.entity.data.mysql.product.ProductImage;
import vn.aeoc.entity.data.mysql.product.ProductSize;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** Plan chi-tiet-giay §9: TC-U1 → TC-U3. */
class ProductDetailServiceTest {
    private static final String DUNK = "nike-dunk-low-retro";

    private ProductRepository repository;
    private ProductImageRepository imageRepository;
    private ProductSizeRepository sizeRepository;
    private ProductDetailService service;

    @BeforeEach
    void setUp() {
        repository = mock(ProductRepository.class);
        imageRepository = mock(ProductImageRepository.class);
        sizeRepository = mock(ProductSizeRepository.class);
        service = new ProductDetailService(repository, imageRepository, sizeRepository,
                new QueryExecutor(Runnable::run));
    }

    private static Product product(int id, int categoryId) {
        Product p = new Product();
        p.setId(id);
        p.setCategoryId(categoryId);
        return p;
    }

    private static void assertNotFound(Runnable call) {
        assertThatThrownBy(call::run)
                .isInstanceOf(AppException.class)
                .hasMessage(ProductDetailService.PRODUCT_NOT_FOUND)
                .satisfies(e -> assertThat(((AppException) e).getStatusCode()).isEqualTo(404));
    }

    @Test
    void tcU1NormalizesSlugBeforeLookup() {
        when(repository.getPublishedBySlug(DUNK)).thenReturn(product(2, 1));

        Product result = service.get("  NIKE-Dunk-Low-Retro ");

        assertThat(result.getId()).isEqualTo(2);
        verify(repository).getPublishedBySlug(DUNK);
    }

    @ParameterizedTest(name = "TC-U1 get({0}) → 404, không gọi repository")
    @NullSource
    @ValueSource(strings = {"", "   "})
    void tcU1BlankSlugIsNotFoundWithoutQuery(String slug) {
        assertNotFound(() -> service.get(slug));
        verifyNoInteractions(repository, imageRepository, sizeRepository);
    }

    @Test
    void tcU1UnknownSlugIsNotFound() {
        when(repository.getPublishedBySlug("khong-co")).thenReturn(null);

        assertNotFound(() -> service.get("khong-co"));
        verifyNoInteractions(imageRepository, sizeRepository);
    }

    @Test
    void tcU2AttachesImagesAndSizes() {
        Product dunk = product(2, 1);
        List<ProductImage> images = IntStream.rangeClosed(1, 5).mapToObj(n -> {
            ProductImage i = new ProductImage();
            i.setId(20 + n);
            i.setProductId(2);
            i.setSortOrder(n);
            return i;
        }).toList();
        List<ProductSize> sizes = IntStream.rangeClosed(1, 13).mapToObj(n -> {
            ProductSize s = new ProductSize();
            s.setId(200 + n);
            s.setProductId(2);
            s.setSizeValue(BigDecimal.valueOf(37 + n));
            s.setStock(20);
            return s;
        }).toList();
        when(repository.getPublishedBySlug(DUNK)).thenReturn(dunk);
        when(imageRepository.listByProduct(2)).thenReturn(images);
        when(sizeRepository.listByProduct(2)).thenReturn(sizes);

        Product result = service.get(DUNK);

        assertThat(result).isSameAs(dunk);
        assertThat(result.getImages()).containsExactlyElementsOf(images);
        assertThat(result.getSizes()).containsExactlyElementsOf(sizes);
        verify(imageRepository, times(1)).listByProduct(2);
        verify(sizeRepository, times(1)).listByProduct(2);
    }

    @Test
    void tcU3RelatedUsesProductAndCategory() {
        List<Product> cards = IntStream.rangeClosed(1, 8).mapToObj(n -> product(n, 3)).toList();
        when(repository.getPublishedBySlug("nike-precision-8-low")).thenReturn(product(19, 3));
        when(repository.listRelated(19, 3, 8)).thenReturn(cards);

        List<Product> result = service.related("nike-precision-8-low");

        assertThat(result).containsExactlyElementsOf(cards);
        verify(repository).listRelated(19, 3, ProductDetailService.RELATED_LIMIT);
        verifyNoInteractions(imageRepository, sizeRepository);
    }

    @Test
    void tcU3RelatedUnknownSlugIsNotFound() {
        when(repository.getPublishedBySlug("khong-co")).thenReturn(null);

        assertNotFound(() -> service.related("khong-co"));
        verify(repository, never()).listRelated(anyInt(), anyInt(), anyInt());
    }
}
