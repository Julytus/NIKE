package vn.aeoc.business.shoporder.repository;

import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.jooq.impl.TableImpl;
import org.springframework.stereotype.Repository;
import vn.aeoc.base.repo.AbsMysqlRepository;
import vn.aeoc.entity.data.mysql.shoporder.ShopOrder;
import vn.entity.backend.tables.records.ShopOrderRecord;

import static vn.entity.backend.tables.ShopOrder.SHOP_ORDER;

@Repository
public class ShopOrderRepository extends AbsMysqlRepository<ShopOrderRecord, ShopOrder, Integer> {
    public ShopOrderRepository(DSLContext dslContext) {
        super(dslContext);
    }

    @Override
    protected TableImpl<ShopOrderRecord> getTable() {
        return SHOP_ORDER;
    }

    public ShopOrder getByCode(String code) {
        return getOne(SHOP_ORDER.CODE.eq(code));
    }

    public void updateCode(Integer id, String code) {
        updateFieldByCondition(SHOP_ORDER.ID.eq(id), SHOP_ORDER.CODE, code);
    }

    public void deleteAll() {
        delete(DSL.trueCondition());
    }
}
