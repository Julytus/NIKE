package vn.aeoc.business.product.service;

import org.springframework.stereotype.Service;
import vn.aeoc.base.constant.ErrorCode;
import vn.aeoc.base.exception.AppException;
import vn.aeoc.base.service.BaseService;
import vn.aeoc.base.util.QueryExecutor;
import vn.aeoc.business.product.repository.ProductSizeRepository;
import vn.aeoc.entity.data.mysql.product.ProductSize;

/**
 * Tồn kho theo size (plan dat-hang §7.2 bước 5): gói khác (đơn hàng, test-support) đổi kho qua service này,
 * không gọi thẳng repository của gói {@code product}.
 */
@Service
public class ProductStockService extends BaseService<ProductSizeRepository, ProductSize, Integer> {
    public static final String INVALID_STOCK = "Stock must be 0 or more.";

    public ProductStockService(ProductSizeRepository repository, QueryExecutor queryExecutor) {
        super(repository, queryExecutor);
    }

    /**
     * Trừ {@code quantity} đôi của size nếu còn đủ (một câu UPDATE có điều kiện, an toàn khi nhiều đơn đồng thời).
     * @return {@code false} khi không còn đủ hàng (hoặc size không tồn tại) — không có gì bị trừ.
     */
    public boolean decrease(int sizeId, int quantity) {
        return repository.decreaseStock(sizeId, quantity) == 1;
    }

    /** Đặt tồn kho một size (chuẩn bị dữ liệu test, plan dat-hang §5.4); chỉ đọc {@code id}, {@code stock}. */
    public ProductSize setStock(ProductSize request) {
        Integer id = request == null ? null : request.getId();
        if (id == null || getById(id) == null) {
            throw new AppException(ErrorCode.DATA_NOT_FOUND);
        }
        Integer stock = request.getStock();
        if (stock == null || stock < 0) {
            throw new AppException(ErrorCode.BAD_REQUEST, INVALID_STOCK);
        }
        repository.updateStock(id, stock);
        return getById(id);
    }
}
