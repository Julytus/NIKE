package vn.aeoc.business.product.repository;

import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.jooq.impl.TableImpl;
import org.springframework.stereotype.Repository;
import vn.aeoc.base.repo.AbsMysqlRepository;
import vn.aeoc.entity.data.mysql.product.ProductImage;
import vn.entity.backend.tables.records.ProductImageRecord;

import java.util.List;

import static vn.entity.backend.tables.ProductImage.PRODUCT_IMAGE;

@Repository
public class ProductImageRepository extends AbsMysqlRepository<ProductImageRecord, ProductImage, Integer> {
    public ProductImageRepository(DSLContext dslContext) {
        super(dslContext);
    }

    @Override
    protected TableImpl<ProductImageRecord> getTable() {
        return PRODUCT_IMAGE;
    }

    public long countAll() {
        return getCountWithCriteria(DSL.trueCondition());
    }

    public List<String> listAllUrls() {
        return dslContext.select(PRODUCT_IMAGE.URL).from(PRODUCT_IMAGE).orderBy(PRODUCT_IMAGE.ID).fetch(PRODUCT_IMAGE.URL);
    }

    public List<ProductImage> listByProduct(Integer productId) {
        return getListByCriteria(PRODUCT_IMAGE.PRODUCT_ID.eq(productId), PRODUCT_IMAGE.SORT_ORDER.asc());
    }

    public void deleteAll() {
        delete(DSL.trueCondition());
    }
}
