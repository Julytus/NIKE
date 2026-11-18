package vn.aeoc.business.product.repository;

import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.jooq.impl.TableImpl;
import org.springframework.stereotype.Repository;
import vn.aeoc.base.repo.AbsMysqlRepository;
import vn.aeoc.entity.data.mysql.product.Product;
import vn.entity.backend.tables.records.ProductRecord;

import java.util.LinkedHashMap;
import java.util.Map;

import static vn.entity.backend.tables.Product.PRODUCT;
import static vn.entity.backend.tables.ProductCategory.PRODUCT_CATEGORY;

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
