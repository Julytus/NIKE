package vn.aeoc.business.product.service;

import org.jooq.Condition;
import org.jooq.impl.DSL;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import vn.aeoc.base.config.extention.paging.Page;
import vn.aeoc.base.util.QueryExecutor;
import vn.aeoc.business.product.repository.ProductCategoryRepository;
import vn.aeoc.business.product.repository.ProductRepository;
import vn.aeoc.entity.data.mysql.product.Product;

import java.util.List;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static vn.entity.backend.tables.Product.PRODUCT;

/** Plan giao-dien-nike §9: TC-U1, TC-U2. */
class ProductCatalogServiceTest {
    private ProductRepository repository;
    private ProductCategoryRepository categoryRepository;
    private ProductCatalogService service;

    @BeforeEach
    void setUp() {
        repository = mock(ProductRepository.class);
        categoryRepository = mock(ProductCategoryRepository.class);
        service = new ProductCatalogService(repository, categoryRepository, new QueryExecutor(Runnable::run));
    }

    @ParameterizedTest(name = "TC-U1 suggest({0}) → trang rỗng, không gọi repository")
    @NullSource
    @ValueSource(strings = {"", "   "})
    void suggestBlankKeywordReturnsEmptyPage(String q) {
        Page<Product> page = service.suggest(q);

        assertThat(page.getTotal()).isZero();
        assertThat(page.getPage()).isEqualTo(1);
        assertThat(page.getItems()).isEmpty();
        verifyNoInteractions(repository, categoryRepository);
    }

    @Test
    void tcU2SuggestTrimsKeywordAndLimitsToSix() {
        Condition published = PRODUCT.STATUS.eq("PUBLISHED");
        Condition keyword = PRODUCT.NAME.containsIgnoreCase("nike");
        List<Product> six = IntStream.rangeClosed(1, 6).mapToObj(i -> {
            Product p = new Product();
            p.setId(i);
            return p;
        }).toList();
        when(repository.publishedCondition()).thenReturn(published);
        when(repository.keywordCondition("nike")).thenReturn(keyword);
        when(repository.countCards(any())).thenReturn(22L);
        when(repository.listCards(any(), anyInt())).thenReturn(six);

        Page<Product> page = service.suggest("  nike  ");

        Condition expected = DSL.and(published, keyword);
        verify(repository).keywordCondition("nike");
        verify(repository).listCards(eq(expected), eq(ProductCatalogService.SUGGEST_LIMIT));
        verify(repository).countCards(eq(expected));
        assertThat(ProductCatalogService.SUGGEST_LIMIT).isEqualTo(6);
        assertThat(page.getTotal()).isEqualTo(22L);
        assertThat(page.getPage()).isEqualTo(1);
        assertThat(page.getItems()).isSameAs(six);
    }
}
