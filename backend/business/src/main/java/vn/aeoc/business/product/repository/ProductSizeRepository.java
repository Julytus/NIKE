package vn.aeoc.business.product.repository;

import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.jooq.impl.TableImpl;
import org.springframework.stereotype.Repository;
import vn.aeoc.base.repo.AbsMysqlRepository;
import vn.aeoc.entity.data.mysql.product.ProductSize;
import vn.entity.backend.tables.records.ProductSizeRecord;

import java.math.BigDecimal;
import java.util.List;

import static vn.entity.backend.tables.ProductSize.PRODUCT_SIZE;

@Repository
public class ProductSizeRepository extends AbsMysqlRepository<ProductSizeRecord, ProductSize, Integer> {
    public ProductSizeRepository(DSLContext dslContext) {
        super(dslContext);
    }

    @Override
    protected TableImpl<ProductSizeRecord> getTable() {
        return PRODUCT_SIZE;
    }

    public long countAll() {
        return getCountWithCriteria(DSL.trueCondition());
    }

    public long countOutOfStock() {
        return getCountWithCriteria(PRODUCT_SIZE.STOCK.eq(0));
    }

    public long totalStock() {
        BigDecimal sum = dslContext.select(DSL.sum(PRODUCT_SIZE.STOCK)).from(PRODUCT_SIZE).fetchOne(0, BigDecimal.class);
        return sum == null ? 0 : sum.longValue();
    }

    /** Size của sản phẩm theo size_value tăng dần. */
    public List<ProductSize> listByProduct(Integer productId) {
        return getListByCriteria(PRODUCT_SIZE.PRODUCT_ID.eq(productId), PRODUCT_SIZE.SIZE_VALUE.asc());
    }

    public void deleteAll() {
        delete(DSL.trueCondition());
    }
}
