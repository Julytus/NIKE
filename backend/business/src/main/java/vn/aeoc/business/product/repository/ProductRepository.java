package vn.aeoc.business.product.repository;

import org.jooq.CaseConditionStep;
import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.Field;
import org.jooq.SortField;
import org.jooq.impl.DSL;
import org.jooq.impl.TableImpl;
import org.springframework.stereotype.Repository;
import vn.aeoc.base.config.extention.paging.Pageable;
import vn.aeoc.base.repo.AbsMysqlRepository;
import vn.aeoc.entity.data.mysql.product.Product;
import vn.entity.backend.tables.records.ProductRecord;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static vn.entity.backend.tables.Product.PRODUCT;
import static vn.entity.backend.tables.ProductCategory.PRODUCT_CATEGORY;
import static vn.entity.backend.tables.ProductImage.PRODUCT_IMAGE;
import static vn.entity.backend.tables.ProductSize.PRODUCT_SIZE;

@Repository
public class ProductRepository extends AbsMysqlRepository<ProductRecord, Product, Integer> {
    public static final String STATUS_PUBLISHED = "PUBLISHED";
    public static final String STATUS_HIDDEN = "HIDDEN";
    public static final String BADGE_JUST_IN = "JUST_IN";
    public static final String BADGE_BESTSELLER = "BESTSELLER";

    /**
     * Khoảng giá đang bán (plan danh-sach-giay §5.0), hai đầu đều tính; {@code [min, max]}, {@code max = null}
     * = không có trần. Thứ tự = thứ tự hiển thị / thứ tự khoá trong facets.
     */
    public static final Map<String, Long[]> PRICE_RANGES;

    static {
        Map<String, Long[]> ranges = new LinkedHashMap<>();
        ranges.put("under-1m", new Long[]{0L, 999_999L});
        ranges.put("1m-2m", new Long[]{1_000_000L, 2_000_000L});
        ranges.put("2m-5m", new Long[]{2_000_001L, 4_999_999L});
        ranges.put("5m-plus", new Long[]{5_000_000L, null});
        PRICE_RANGES = Collections.unmodifiableMap(ranges);
    }

    public ProductRepository(DSLContext dslContext) {
        super(dslContext);
    }

    @Override
    protected TableImpl<ProductRecord> getTable() {
        return PRODUCT;
    }

    public long countAll() {
        return getCountWithCriteria(DSL.trueCondition());
    }

    public long countByStatus(String status) {
        return getCountWithCriteria(PRODUCT.STATUS.eq(status));
    }

    /** Sản phẩm đang bán có giá giảm. */
    public long countPublishedOnSale() {
        return getCountWithCriteria(published().and(PRODUCT.SALE_PRICE.isNotNull()));
    }

    /** Sản phẩm đang bán có nhãn {@code badge} (JUST_IN / BESTSELLER). */
    public long countPublishedByBadge(String badge) {
        return getCountWithCriteria(published().and(PRODUCT.BADGE.eq(badge)));
    }

    private static Condition published() {
        return PRODUCT.STATUS.eq(STATUS_PUBLISHED);
    }

    /* ---------- Thẻ sản phẩm cho cửa hàng (plan giao-dien-nike §5.2, §5.3; lát 1.4 dùng lại) ---------- */

    /** Sản phẩm đang bán. */
    public Condition publishedCondition() {
        return published();
    }

    /**
     * Tên / phụ đề / mã chứa {@code q}, không phân biệt hoa thường (collation ai_ci: cả dấu).
     * {@code containsIgnoreCase} tự escape {@code %} và {@code _}.
     */
    public Condition keywordCondition(String q) {
        return PRODUCT.NAME.containsIgnoreCase(q)
                .or(PRODUCT.SUBTITLE.containsIgnoreCase(q))
                .or(PRODUCT.STYLE_CODE.containsIgnoreCase(q));
    }

    /** Mọi cột + {@code image_url} (ảnh số 1) + {@code total_stock} (tổng tồn kho). */
    private List<Field<?>> cardFields() {
        Field<String> imageUrl = DSL.field(DSL.select(PRODUCT_IMAGE.URL)
                .from(PRODUCT_IMAGE)
                .where(PRODUCT_IMAGE.PRODUCT_ID.eq(PRODUCT.ID).and(PRODUCT_IMAGE.SORT_ORDER.eq((byte) 1)))
                .limit(1));
        return mergeFields(imageUrl.as("image_url"), totalStock().as("total_stock"));
    }

    /** {@code COALESCE(SUM(product_size.stock), 0)} của sản phẩm (subquery tương quan). */
    private static Field<BigDecimal> totalStock() {
        Field<BigDecimal> stock = DSL.field(DSL.select(DSL.sum(PRODUCT_SIZE.STOCK))
                .from(PRODUCT_SIZE)
                .where(PRODUCT_SIZE.PRODUCT_ID.eq(PRODUCT.ID)));
        return DSL.coalesce(stock, BigDecimal.ZERO);
    }

    /** Thẻ sản phẩm khớp {@code condition}, mới nhất trước, tối đa {@code limit}. */
    public List<Product> listCards(Condition condition, int limit) {
        return getListByCriteriaWithJoin(cardFields(), PRODUCT, condition,
                List.of(PRODUCT.CREATED_TIME.desc(), PRODUCT.ID.desc()),
                new Pageable().setLimit(limit));
    }

    public Long countCards(Condition condition) {
        return getCountWithCriteria(condition);
    }

    /* ---------- Danh sách giày có lọc + số đếm theo bộ lọc (plan danh-sach-giay §5) ---------- */

    /** Giá đang bán = {@code COALESCE(sale_price, price)}. */
    public static Field<Long> sellingPrice() {
        return DSL.coalesce(PRODUCT.SALE_PRICE, PRODUCT.PRICE);
    }

    /**
     * Điều kiện của bộ lọc {@code f} trên sản phẩm đang bán, bỏ nhóm {@code skip} ({@code null} = áp đủ).
     * Chỉ tham chiếu {@code PRODUCT}; size qua {@code DSL.exists}. Danh mục và từ khoá luôn áp.
     */
    public Condition catalogCondition(CatalogFilter f, CatalogGroup skip) {
        Condition condition = published();
        if (f.categoryId() != null) {
            condition = condition.and(PRODUCT.CATEGORY_ID.eq(f.categoryId()));
        }
        if (f.keyword() != null) {
            condition = condition.and(keywordCondition(f.keyword()));
        }
        if (skip != CatalogGroup.GENDER && !f.genders().isEmpty()) {
            condition = condition.and(PRODUCT.GENDER.in(f.genders()));
        }
        if (skip != CatalogGroup.PRICE && !f.priceRanges().isEmpty()) {
            condition = condition.and(DSL.or(f.priceRanges().stream().map(ProductRepository::priceRangeCondition).toList()));
        }
        if (skip != CatalogGroup.SALE && f.sale()) {
            condition = condition.and(PRODUCT.SALE_PRICE.isNotNull());
        }
        if (skip != CatalogGroup.BADGE && !f.badges().isEmpty()) {
            condition = condition.and(PRODUCT.BADGE.in(f.badges()));
        }
        if (skip != CatalogGroup.SIZE && !f.sizes().isEmpty()) {
            condition = condition.and(DSL.exists(DSL.selectOne()
                    .from(PRODUCT_SIZE)
                    .where(PRODUCT_SIZE.PRODUCT_ID.eq(PRODUCT.ID),
                            PRODUCT_SIZE.SIZE_VALUE.in(f.sizes()),
                            PRODUCT_SIZE.STOCK.gt(0))));
        }
        return condition;
    }

    /** Giá đang bán nằm trong khoảng {@code key} (hằng số inline để CASE trong SELECT và GROUP BY trùng nhau). */
    private static Condition priceRangeCondition(String key) {
        Long[] bounds = PRICE_RANGES.get(key);
        Condition condition = sellingPrice().ge(DSL.inline(bounds[0]));
        return bounds[1] == null ? condition : condition.and(sellingPrice().le(DSL.inline(bounds[1])));
    }

    /** Một trang thẻ sản phẩm theo kiểu sắp xếp (§5.1), luôn kết thúc bằng mới nhất trước. */
    public List<Product> listCatalog(Condition condition, CatalogSort sort, Pageable pageable) {
        return getListByCriteriaWithJoin(cardFields(), PRODUCT, condition, catalogOrders(sort), pageable);
    }

    private static List<SortField<?>> catalogOrders(CatalogSort sort) {
        List<SortField<?>> orders = new ArrayList<>();
        switch (sort) {
            case FEATURED -> {
                orders.add(DSL.when(totalStock().eq(BigDecimal.ZERO), 1).otherwise(0).asc());
                orders.add(DSL.when(PRODUCT.BADGE.eq(BADGE_JUST_IN), 0)
                        .when(PRODUCT.BADGE.eq(BADGE_BESTSELLER), 1)
                        .otherwise(2).asc());
            }
            case PRICE_DESC -> orders.add(sellingPrice().desc());
            case PRICE_ASC -> orders.add(sellingPrice().asc());
            case NEWEST -> { }
        }
        orders.add(PRODUCT.CREATED_TIME.desc());
        orders.add(PRODUCT.ID.desc());
        return orders;
    }

    /** Số sản phẩm theo cột {@code gender} (chỉ giá trị có sản phẩm). */
    public Map<String, Integer> countByGender(Condition condition) {
        return countGroupBy(PRODUCT.GENDER, PRODUCT.ID, PRODUCT, condition);
    }

    /** Số sản phẩm theo khoá khoảng giá (chỉ khoảng có sản phẩm) — một truy vấn {@code GROUP BY CASE}. */
    public Map<String, Integer> countByPriceRange(Condition condition) {
        CaseConditionStep<String> range = null;
        for (String key : PRICE_RANGES.keySet()) {
            range = range == null
                    ? DSL.when(priceRangeCondition(key), DSL.inline(key))
                    : range.when(priceRangeCondition(key), DSL.inline(key));
        }
        Field<String> rangeField = range.otherwise(DSL.inline((String) null));
        Map<String, Integer> result = countGroupBy(rangeField, PRODUCT.ID, PRODUCT, condition);
        result.remove(null);
        return result;
    }

    public int countOnSale(Condition condition) {
        return getCountWithCriteria(condition.and(PRODUCT.SALE_PRICE.isNotNull())).intValue();
    }

    /** Số sản phẩm theo cột {@code badge} (bỏ sản phẩm không nhãn). */
    public Map<String, Integer> countByBadge(Condition condition) {
        return countGroupBy(PRODUCT.BADGE, PRODUCT.ID, PRODUCT, condition.and(PRODUCT.BADGE.isNotNull()));
    }

    /** Theo {@code size_value}: số sản phẩm khớp {@code condition} còn hàng ở size đó (viết tay: bảng product_size). */
    public Map<BigDecimal, Integer> countInStockBySize(Condition condition) {
        return dslContext.select(PRODUCT_SIZE.SIZE_VALUE, DSL.countDistinct(PRODUCT_SIZE.PRODUCT_ID))
                .from(PRODUCT_SIZE)
                .where(PRODUCT_SIZE.STOCK.gt(0)
                        .and(PRODUCT_SIZE.PRODUCT_ID.in(DSL.select(PRODUCT.ID).from(PRODUCT).where(condition))))
                .groupBy(PRODUCT_SIZE.SIZE_VALUE)
                .fetchMap(r -> r.value1(), r -> r.value2());
    }

    /** Mọi {@code size_value} của sản phẩm đang bán, không trùng, tăng dần. */
    public List<BigDecimal> listPublishedSizeValues() {
        return dslContext.selectDistinct(PRODUCT_SIZE.SIZE_VALUE)
                .from(PRODUCT_SIZE)
                .where(PRODUCT_SIZE.PRODUCT_ID.in(DSL.select(PRODUCT.ID).from(PRODUCT).where(published())))
                .orderBy(PRODUCT_SIZE.SIZE_VALUE.asc())
                .fetch(PRODUCT_SIZE.SIZE_VALUE);
    }

    /** Số sản phẩm đang bán theo slug danh mục; đủ mọi danh mục (0 nếu trống), theo sort_order. */
    public Map<String, Integer> countPublishedByCategory() {
        Map<String, Integer> result = new LinkedHashMap<>();
        dslContext.select(PRODUCT_CATEGORY.SLUG, DSL.count(PRODUCT.ID))
                .from(PRODUCT_CATEGORY)
                .leftJoin(PRODUCT).on(PRODUCT.CATEGORY_ID.eq(PRODUCT_CATEGORY.ID)
                        .and(PRODUCT.STATUS.eq(STATUS_PUBLISHED)))
                .groupBy(PRODUCT_CATEGORY.ID, PRODUCT_CATEGORY.SLUG, PRODUCT_CATEGORY.SORT_ORDER)
                .orderBy(PRODUCT_CATEGORY.SORT_ORDER, PRODUCT_CATEGORY.ID)
                .forEach(r -> result.put(r.value1(), r.value2()));
        return result;
    }

    /** Số sản phẩm đang bán theo giới tính (chỉ các giới tính có sản phẩm). */
    public Map<String, Integer> countPublishedByGender() {
        return countGroupBy(PRODUCT.GENDER, PRODUCT.ID, PRODUCT, published());
    }

    /** Sản phẩm có id nhỏ nhất (mẫu cho summary). */
    public Product getFirst() {
        return getOne(PRODUCT.ID.eq(DSL.select(DSL.min(PRODUCT.ID)).from(PRODUCT)));
    }

    /** Xoá toàn bộ (chỉ dùng khi reset dữ liệu mẫu, sau khi đã xoá ảnh và size). */
    public void deleteAll() {
        delete(DSL.trueCondition());
    }
}
