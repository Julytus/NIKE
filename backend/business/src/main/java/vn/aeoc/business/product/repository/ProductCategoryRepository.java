package vn.aeoc.business.product.repository;

import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.jooq.impl.TableImpl;
import org.springframework.stereotype.Repository;
import vn.aeoc.base.repo.AbsMysqlRepository;
import vn.aeoc.entity.data.mysql.product.ProductCategory;
import vn.entity.backend.tables.records.ProductCategoryRecord;

import static vn.entity.backend.tables.ProductCategory.PRODUCT_CATEGORY;

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

    /** Xoá toàn bộ (chỉ dùng khi reset dữ liệu mẫu, sau khi đã xoá product). */
    public void deleteAll() {
        delete(DSL.trueCondition());
    }
}
