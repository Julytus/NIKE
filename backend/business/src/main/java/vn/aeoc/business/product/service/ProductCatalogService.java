package vn.aeoc.business.product.service;

import org.jooq.Condition;
import org.springframework.stereotype.Service;
import vn.aeoc.base.config.extention.paging.Page;
import vn.aeoc.base.config.extention.paging.Pageable;
import vn.aeoc.base.constant.ErrorCode;
import vn.aeoc.base.exception.AppException;
import vn.aeoc.base.service.BaseService;
import vn.aeoc.base.util.QueryExecutor;
import vn.aeoc.business.product.repository.CatalogFilter;
import vn.aeoc.business.product.repository.CatalogGroup;
import vn.aeoc.business.product.repository.CatalogSort;
import vn.aeoc.business.product.repository.ProductCategoryRepository;
import vn.aeoc.business.product.repository.ProductRepository;
import vn.aeoc.entity.data.mysql.product.Product;
import vn.aeoc.entity.data.mysql.product.ProductCategory;
import vn.aeoc.entity.data.mysql.product.ProductFacets;
import vn.aeoc.entity.data.mysql.product.ProductFilter;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.regex.Pattern;

import static vn.entity.backend.tables.Product.PRODUCT;

/**
 * Dữ liệu công khai cho khung cửa hàng (plan giao-dien-nike §5): danh mục, "Mới về", gợi ý tìm kiếm.
 * Lát danh-sach-giay §5: danh sách có lọc / sắp xếp / phân trang và số đếm theo bộ lọc (facets).
 * Không cache: dữ liệu nhỏ, và test-support/reset đổi dữ liệu giữa các lần chạy test.
 */
@Service
public class ProductCatalogService extends BaseService<ProductRepository, Product, Integer> {
    public static final int NEW_ARRIVALS_LIMIT = 12;
    public static final int SUGGEST_LIMIT = 6;
    static final String BADGE_JUST_IN = ProductRepository.BADGE_JUST_IN;

    /** Danh sách giày (plan danh-sach-giay §5.1). */
    public static final int CATALOG_PAGE_SIZE = 12;
    public static final int CATALOG_MAX_LIMIT = 48;
    public static final String CATEGORY_NOT_FOUND = "Category not found";

    /** Giá trị URL → giá trị cột (§5.0); thứ tự = thứ tự khoá trong facets. */
    static final Map<String, String> GENDER_VALUES = orderedMap("men", "MEN", "women", "WOMEN", "unisex", "UNISEX");
    static final Map<String, String> KIDS_VALUES = orderedMap("boys", "BOYS", "girls", "GIRLS");
    static final Map<String, String> BADGE_VALUES = orderedMap(
            "just-in", ProductRepository.BADGE_JUST_IN, "bestseller", ProductRepository.BADGE_BESTSELLER);
    private static final String SALE_ON = "1";
    /** Số EU: phần nguyên + phần thập phân tuỳ chọn; chuỗi khác bị bỏ. */
    private static final Pattern SIZE_PATTERN = Pattern.compile("\\d{1,3}(\\.\\d)?");

    private final ProductCategoryRepository categoryRepository;

    public ProductCatalogService(ProductRepository repository,
                                 ProductCategoryRepository categoryRepository,
                                 QueryExecutor queryExecutor) {
        super(repository, queryExecutor);
        this.categoryRepository = categoryRepository;
    }

    public List<ProductCategory> categories() {
        return categoryRepository.listWithStats();
    }

    public List<Product> newArrivals() {
        return repository.listCards(
                repository.publishedCondition().and(PRODUCT.BADGE.eq(BADGE_JUST_IN)),
                NEW_ARRIVALS_LIMIT);
    }

    /** Từ khoá rỗng (sau trim) → trang rỗng, không truy vấn DB. */
    public Page<Product> suggest(String q) {
        String keyword = q == null ? "" : q.trim();
        Pageable pageable = new Pageable().setLimit(SUGGEST_LIMIT);
        if (keyword.isEmpty()) {
            return new Page<>(0L, pageable.getPage(), List.of());
        }
        Condition condition = repository.publishedCondition().and(repository.keywordCondition(keyword));
        return pageQuery(pageable,
                () -> repository.listCards(condition, SUGGEST_LIMIT),
                () -> repository.countCards(condition));
    }

    /* ---------- Danh sách giày có lọc + số đếm (plan danh-sach-giay §5) ---------- */

    /** Thẻ một trang theo bộ lọc; {@code page} < 1 → 1, {@code limit} < 1 → 12, > 48 → 48. */
    public Page<Product> list(ProductFilter filter, int page, int limit) {
        CatalogFilter f = toCatalogFilter(filter);
        CatalogSort sort = parseSort(filter.getSort());
        Pageable pageable = new Pageable()
                .setPage(Math.max(page, 1))
                .setLimit(limit < 1 ? CATALOG_PAGE_SIZE : Math.min(limit, CATALOG_MAX_LIMIT));
        Condition condition = repository.catalogCondition(f, null);
        return pageQuery(pageable,
                () -> repository.listCatalog(condition, sort, pageable),
                () -> repository.countCards(condition));
    }

    /** Số sản phẩm theo từng lựa chọn; mỗi nhóm bỏ điều kiện của chính nó, đủ khoá theo thứ tự §5.2. */
    public ProductFacets facets(ProductFilter filter) {
        CatalogFilter f = toCatalogFilter(filter);
        ProductFacets facets = new ProductFacets();

        Map<String, Integer> byGender = repository.countByGender(repository.catalogCondition(f, CatalogGroup.GENDER));
        facets.setGender(fill(GENDER_VALUES, byGender));
        facets.setKids(fill(KIDS_VALUES, byGender));

        Map<String, Integer> byPrice = repository.countByPriceRange(repository.catalogCondition(f, CatalogGroup.PRICE));
        Map<String, Integer> price = new LinkedHashMap<>();
        for (String key : ProductRepository.PRICE_RANGES.keySet()) {
            price.put(key, byPrice.getOrDefault(key, 0));
        }
        facets.setPrice(price);

        facets.setSale(repository.countOnSale(repository.catalogCondition(f, CatalogGroup.SALE)));
        facets.setBadge(fill(BADGE_VALUES,
                repository.countByBadge(repository.catalogCondition(f, CatalogGroup.BADGE))));

        // Khoá BigDecimal so theo giá trị (42 = 42.0)
        Map<BigDecimal, Integer> bySize = new TreeMap<>(
                repository.countInStockBySize(repository.catalogCondition(f, CatalogGroup.SIZE)));
        facets.setSize(repository.listPublishedSizeValues().stream()
                .map(v -> new ProductFacets.SizeCount(v, sizeLabel(v), bySize.getOrDefault(v, 0)))
                .toList());
        return facets;
    }

    /**
     * Chuẩn hoá bộ lọc (§5.0): tách dấu phẩy, trim, chữ thường, bỏ giá trị lạ. Slug danh mục không có
     * → 404 "Category not found" (trước khi truy vấn sản phẩm).
     */
    CatalogFilter toCatalogFilter(ProductFilter filter) {
        Set<String> genders = new LinkedHashSet<>();
        mapValues(filter.getGender(), GENDER_VALUES, genders);
        mapValues(filter.getKids(), KIDS_VALUES, genders);

        Set<String> prices = new LinkedHashSet<>();
        for (String v : split(filter.getPrice())) {
            if (ProductRepository.PRICE_RANGES.containsKey(v)) {
                prices.add(v);
            }
        }

        Set<String> badges = new LinkedHashSet<>();
        mapValues(filter.getBadge(), BADGE_VALUES, badges);

        Set<BigDecimal> sizes = new TreeSet<>();
        for (String v : split(filter.getSize())) {
            if (SIZE_PATTERN.matcher(v).matches()) {
                sizes.add(new BigDecimal(v));
            }
        }

        boolean sale = SALE_ON.equals(trimToNull(filter.getSale()));
        String keyword = trimToNull(filter.getQ());

        Integer categoryId = null;
        String slug = trimToNull(filter.getCategory());
        if (slug != null) {
            ProductCategory category = categoryRepository.getBySlug(slug.toLowerCase(Locale.ROOT));
            if (category == null) {
                throw new AppException(ErrorCode.DATA_NOT_FOUND, CATEGORY_NOT_FOUND);
            }
            categoryId = category.getId();
        }
        return new CatalogFilter(categoryId, genders, prices, sale, badges, sizes, keyword);
    }

    /** Giá trị {@code sort} → kiểu sắp xếp; lạ / thiếu → FEATURED. */
    static CatalogSort parseSort(String sort) {
        return CatalogSort.from(sort);
    }

    /** "EU 42", "EU 40.5" (không có ".0"). */
    static String sizeLabel(BigDecimal value) {
        return "EU " + value.stripTrailingZeros().toPlainString();
    }

    private static List<String> split(String raw) {
        if (raw == null) {
            return List.of();
        }
        return Arrays.stream(raw.split(","))
                .map(s -> s.trim().toLowerCase(Locale.ROOT))
                .filter(s -> !s.isEmpty())
                .toList();
    }

    private static void mapValues(String raw, Map<String, String> known, Set<String> target) {
        for (String v : split(raw)) {
            String mapped = known.get(v);
            if (mapped != null) {
                target.add(mapped);
            }
        }
    }

    /** Khoá URL → số đếm theo giá trị DB, đủ khoá theo thứ tự {@code known}. */
    private static Map<String, Integer> fill(Map<String, String> known, Map<String, Integer> counts) {
        Map<String, Integer> result = new LinkedHashMap<>();
        known.forEach((key, dbValue) -> result.put(key, counts.getOrDefault(dbValue, 0)));
        return result;
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static Map<String, String> orderedMap(String... pairs) {
        Map<String, String> map = new LinkedHashMap<>();
        for (int i = 0; i < pairs.length; i += 2) {
            map.put(pairs[i], pairs[i + 1]);
        }
        return Collections.unmodifiableMap(map);
    }
}
