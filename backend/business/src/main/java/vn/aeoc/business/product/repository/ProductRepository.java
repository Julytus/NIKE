package vn.aeoc.business.product.repository;

import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.Field;
import org.jooq.impl.DSL;
import org.jooq.impl.TableImpl;
import org.springframework.stereotype.Repository;
import vn.aeoc.base.config.extention.paging.Pageable;
import vn.aeoc.base.repo.AbsMysqlRepository;
import vn.aeoc.entity.data.mysql.product.Product;
import vn.entity.backend.tables.records.ProductRecord;

import java.math.BigDecimal;
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
        Field<BigDecimal> stock = DSL.field(DSL.select(DSL.sum(PRODUCT_SIZE.STOCK))
                .from(PRODUCT_SIZE)
                .where(PRODUCT_SIZE.PRODUCT_ID.eq(PRODUCT.ID)));
        return mergeFields(imageUrl.as("image_url"), DSL.coalesce(stock, BigDecimal.ZERO).as("total_stock"));
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
