package vn.aeoc.business.product.repository;

import org.jooq.DSLContext;
import org.jooq.Field;
import org.jooq.impl.DSL;
import org.jooq.impl.TableImpl;
import org.springframework.stereotype.Repository;
import vn.aeoc.base.repo.AbsMysqlRepository;
import vn.aeoc.entity.data.mysql.cart.CartLine;
import vn.aeoc.entity.data.mysql.product.ProductSize;
import vn.entity.backend.tables.records.ProductSizeRecord;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;

import static vn.entity.backend.tables.Product.PRODUCT;
import static vn.entity.backend.tables.ProductImage.PRODUCT_IMAGE;
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

    /**
     * Dòng giỏ hàng (plan gio-hang §7.2 bước 2): một truy vấn {@code product_size ⨝ product} + ảnh số 1,
     * lọc theo size id. Size không tồn tại thì không có dòng; mọi trạng thái sản phẩm đều trả (service xét).
     */
    public List<CartLine> listCartRows(Collection<Integer> sizeIds) {
        if (sizeIds.isEmpty()) {
            return List.of();
        }
        Field<String> imageUrl = DSL.field(DSL.select(PRODUCT_IMAGE.URL)
                .from(PRODUCT_IMAGE)
                .where(PRODUCT_IMAGE.PRODUCT_ID.eq(PRODUCT.ID).and(PRODUCT_IMAGE.SORT_ORDER.eq((byte) 1)))
                .limit(1));
        return dslContext.select(
                        PRODUCT_SIZE.ID.as("size_id"),
                        PRODUCT_SIZE.STOCK.as("stock"),
                        PRODUCT_SIZE.SIZE_LABEL.as("size_label"),
                        PRODUCT.ID.as("product_id"),
                        PRODUCT.SLUG.as("slug"),
                        PRODUCT.NAME.as("name"),
                        PRODUCT.SUBTITLE.as("subtitle"),
                        PRODUCT.PRICE.as("price"),
                        PRODUCT.SALE_PRICE.as("sale_price"),
                        imageUrl.as("image_url"),
                        PRODUCT.STATUS.as("product_status"))
                .from(PRODUCT_SIZE)
                .join(PRODUCT).on(PRODUCT.ID.eq(PRODUCT_SIZE.PRODUCT_ID))
                .where(PRODUCT_SIZE.ID.in(sizeIds))
                .fetchInto(CartLine.class);
    }

    public void deleteAll() {
        delete(DSL.trueCondition());
    }
}
