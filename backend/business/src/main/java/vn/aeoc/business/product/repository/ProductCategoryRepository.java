package vn.aeoc.business.product.repository;

import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.Field;
import org.jooq.impl.DSL;
import org.jooq.impl.TableImpl;
import org.springframework.stereotype.Repository;
import vn.aeoc.base.repo.AbsMysqlRepository;
import vn.aeoc.entity.data.mysql.product.ProductCategory;
import vn.entity.backend.tables.records.ProductCategoryRecord;

import java.util.List;

import static vn.entity.backend.tables.Product.PRODUCT;
import static vn.entity.backend.tables.ProductCategory.PRODUCT_CATEGORY;
import static vn.entity.backend.tables.ProductImage.PRODUCT_IMAGE;

@Repository
public class ProductCategoryRepository extends AbsMysqlRepository<ProductCategoryRecord, ProductCategory, Integer> {
    public ProductCategoryRepository(DSLContext dslContext) {
        super(dslContext);
    }

    @Override
    protected TableImpl<ProductCategoryRecord> getTable() {
        return PRODUCT_CATEGORY;
    }

    public boolean isEmpty() {
        return !exists(DSL.trueCondition());
    }

    public long countAll() {
        return getCountWithCriteria(DSL.trueCondition());
    }

    /**
     * Mọi danh mục (theo sort_order, id) + {@code product_count} (số sản phẩm PUBLISHED)
     * + {@code image_url} (ảnh số 1 của sản phẩm PUBLISHED mới nhất; không có → null).
     */
    public List<ProductCategory> listWithStats() {
        Condition publishedInCategory = PRODUCT.CATEGORY_ID.eq(PRODUCT_CATEGORY.ID)
                .and(PRODUCT.STATUS.eq(ProductRepository.STATUS_PUBLISHED));
        Field<Integer> productCount = DSL.field(DSL.selectCount().from(PRODUCT).where(publishedInCategory));
        Field<String> imageUrl = DSL.field(DSL.select(PRODUCT_IMAGE.URL)
                .from(PRODUCT)
                .join(PRODUCT_IMAGE).on(PRODUCT_IMAGE.PRODUCT_ID.eq(PRODUCT.ID)
                        .and(PRODUCT_IMAGE.SORT_ORDER.eq((byte) 1)))
                .where(publishedInCategory)
                .orderBy(PRODUCT.CREATED_TIME.desc(), PRODUCT.ID.desc())
                .limit(1));
        return getListByCriteriaWithJoin(
                mergeFields(productCount.as("product_count"), imageUrl.as("image_url")),
                PRODUCT_CATEGORY, DSL.noCondition(),
                List.of(PRODUCT_CATEGORY.SORT_ORDER.asc(), PRODUCT_CATEGORY.ID.asc()));
    }

    /** Xoá toàn bộ (chỉ dùng khi reset dữ liệu mẫu, sau khi đã xoá product). */
    public void deleteAll() {
        delete(DSL.trueCondition());
    }
}
