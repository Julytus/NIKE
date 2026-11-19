package vn.aeoc.business.product.service;

import org.jooq.Condition;
import org.jooq.impl.DSL;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import vn.aeoc.base.config.extention.paging.Page;
import vn.aeoc.base.config.extention.paging.Pageable;
import vn.aeoc.base.exception.AppException;
import vn.aeoc.base.util.QueryExecutor;
import vn.aeoc.business.product.repository.CatalogFilter;
import vn.aeoc.business.product.repository.CatalogSort;
import vn.aeoc.business.product.repository.ProductCategoryRepository;
import vn.aeoc.business.product.repository.ProductRepository;
import vn.aeoc.entity.data.mysql.product.Product;
import vn.aeoc.entity.data.mysql.product.ProductCategory;
import vn.aeoc.entity.data.mysql.product.ProductFacets;
import vn.aeoc.entity.data.mysql.product.ProductFilter;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static vn.entity.backend.tables.Product.PRODUCT;

/** Plan giao-dien-nike §9: TC-U1, TC-U2; plan danh-sach-giay §9: TC-U1 → TC-U4 (tên hàm có tiền tố {@code catalog}). */
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
    /* ---------- Lát danh-sach-giay ---------- */

    private static ProductCategory category(int id) {
        ProductCategory c = new ProductCategory();
        c.setId(id);
        return c;
    }

    @Test
    void catalogTcU1NormalizesFilter() {
        when(categoryRepository.getBySlug("basketball")).thenReturn(category(3));
        ProductFilter filter = new ProductFilter();
        filter.setCategory("basketball");
        filter.setGender(" Men ,xyz");
        filter.setKids("girls");
        filter.setPrice("abc,1m-2m");
        filter.setSale("1");
        filter.setBadge("just-in,x");
        filter.setSize("42, 40.5,abc,42");
        filter.setQ("  jordan ");

        CatalogFilter f = service.toCatalogFilter(filter);

        assertThat(f.categoryId()).isEqualTo(3);
        assertThat(f.genders()).containsExactly("MEN", "GIRLS");
        assertThat(f.priceRanges()).containsExactly("1m-2m");
        assertThat(f.sale()).isTrue();
        assertThat(f.badges()).containsExactly("JUST_IN");
        assertThat(f.sizes()).containsExactly(new BigDecimal("40.5"), new BigDecimal("42"));
        assertThat(f.keyword()).isEqualTo("jordan");

        ProductFilter empty = new ProductFilter();
        empty.setSale("0");
        empty.setQ("   ");
        CatalogFilter none = service.toCatalogFilter(empty);

        assertThat(none.sale()).isFalse();
        assertThat(none.keyword()).isNull();
        assertThat(none.categoryId()).isNull();
        assertThat(none.genders()).isEmpty();
        assertThat(none.priceRanges()).isEmpty();
        assertThat(none.badges()).isEmpty();
        assertThat(none.sizes()).isEmpty();
        // Lần 2 không có category → không tra danh mục (chỉ đúng 1 lần gọi, của lần 1)
        verify(categoryRepository, times(1)).getBySlug(any());

        assertThat(ProductCatalogService.parseSort("bad")).isEqualTo(CatalogSort.FEATURED);
        assertThat(ProductCatalogService.parseSort(null)).isEqualTo(CatalogSort.FEATURED);
        assertThat(ProductCatalogService.parseSort("PRICE-ASC")).isEqualTo(CatalogSort.PRICE_ASC);
    }

    @Test
    void catalogTcU2ClampsPageAndLimit() {
        List<Product> two = List.of(new Product(), new Product());
        when(repository.listCatalog(any(), any(), any())).thenReturn(two);
        when(repository.countCards(any())).thenReturn(30L);
        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);

        Page<Product> first = service.list(new ProductFilter(), 0, 0);
        service.list(new ProductFilter(), 3, 1000);

        verify(repository, times(2)).listCatalog(any(), eq(CatalogSort.FEATURED), pageable.capture());
        Pageable p1 = pageable.getAllValues().get(0);
        Pageable p2 = pageable.getAllValues().get(1);
        assertThat(p1.getPage()).isEqualTo(1);
        assertThat(p1.getLimit()).isEqualTo(12);
        assertThat(p1.getOffset()).isZero();
        assertThat(p2.getPage()).isEqualTo(3);
        assertThat(p2.getLimit()).isEqualTo(48);
        assertThat(p2.getOffset()).isEqualTo(96);
        assertThat(first.getTotal()).isEqualTo(30L);
        assertThat(first.getItems()).isSameAs(two);
    }

    @Test
    void catalogTcU3UnknownCategoryIs404() {
        when(categoryRepository.getBySlug("khong-co")).thenReturn(null);
        ProductFilter filter = new ProductFilter();
        filter.setCategory("khong-co");

        assertThatThrownBy(() -> service.list(filter, 1, 12))
                .isInstanceOf(AppException.class)
                .hasMessage(ProductCatalogService.CATEGORY_NOT_FOUND)
                .satisfies(e -> assertThat(((AppException) e).getStatusCode()).isEqualTo(404));
        assertThatThrownBy(() -> service.facets(filter))
                .isInstanceOf(AppException.class)
                .hasMessage("Category not found")
                .satisfies(e -> assertThat(((AppException) e).getStatusCode()).isEqualTo(404));
        verifyNoInteractions(repository);
    }

    @Test
    void catalogTcU4FacetsFillsKeysInOrder() {
        when(repository.countByGender(any())).thenReturn(Map.of("MEN", 3, "BOYS", 1));
        when(repository.countByPriceRange(any())).thenReturn(Map.of("2m-5m", 2));
        when(repository.countOnSale(any())).thenReturn(1);
        when(repository.countByBadge(any())).thenReturn(Map.of());
        when(repository.listPublishedSizeValues()).thenReturn(List.of(new BigDecimal("40.5"), new BigDecimal("42.0")));
        when(repository.countInStockBySize(any())).thenReturn(Map.of(new BigDecimal("42.0"), 2));

        ProductFacets facets = service.facets(new ProductFilter());

        assertThat(facets.getGender()).containsExactly(
                Map.entry("men", 3), Map.entry("women", 0), Map.entry("unisex", 0));
        assertThat(facets.getKids()).containsExactly(Map.entry("boys", 1), Map.entry("girls", 0));
        assertThat(facets.getPrice()).containsExactly(
                Map.entry("under-1m", 0), Map.entry("1m-2m", 0), Map.entry("2m-5m", 2), Map.entry("5m-plus", 0));
        assertThat(facets.getSale()).isEqualTo(1);
        assertThat(facets.getBadge()).containsExactly(Map.entry("just-in", 0), Map.entry("bestseller", 0));
        assertThat(facets.getSize()).containsExactly(
                new ProductFacets.SizeCount(new BigDecimal("40.5"), "EU 40.5", 0),
                new ProductFacets.SizeCount(new BigDecimal("42.0"), "EU 42", 2));
    }
}
