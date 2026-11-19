package vn.aeoc.business.shoporder.repository;

import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.jooq.impl.TableImpl;
import org.springframework.stereotype.Repository;
import vn.aeoc.base.repo.AbsMysqlRepository;
import vn.aeoc.entity.data.mysql.shoporder.ShopOrderItem;
import vn.entity.backend.tables.records.ShopOrderItemRecord;

import java.util.List;

import static vn.entity.backend.tables.ShopOrderItem.SHOP_ORDER_ITEM;

@Repository
public class ShopOrderItemRepository extends AbsMysqlRepository<ShopOrderItemRecord, ShopOrderItem, Integer> {
    public ShopOrderItemRepository(DSLContext dslContext) {
        super(dslContext);
    }

    @Override
    protected TableImpl<ShopOrderItemRecord> getTable() {
        return SHOP_ORDER_ITEM;
    }

    /** Dòng của đơn theo id tăng dần (= thứ tự dòng trong request lúc đặt). */
    public List<ShopOrderItem> listByOrder(Integer orderId) {
        return getListByCriteria(SHOP_ORDER_ITEM.ORDER_ID.eq(orderId), SHOP_ORDER_ITEM.ID.asc());
    }

    public void insertAll(List<ShopOrderItem> items) {
        insertBatchReturning(items);
    }

    public void deleteAll() {
        delete(DSL.trueCondition());
    }
}
