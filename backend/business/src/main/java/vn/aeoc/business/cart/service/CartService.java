package vn.aeoc.business.cart.service;

import org.springframework.stereotype.Service;
import vn.aeoc.base.constant.ErrorCode;
import vn.aeoc.base.exception.AppException;
import vn.aeoc.base.service.BaseService;
import vn.aeoc.base.util.QueryExecutor;
import vn.aeoc.business.cart.ShippingPolicy;
import vn.aeoc.business.product.repository.ProductSizeRepository;
import vn.aeoc.entity.data.mysql.cart.CartCheck;
import vn.aeoc.entity.data.mysql.cart.CartItem;
import vn.aeoc.entity.data.mysql.cart.CartLine;
import vn.aeoc.entity.data.mysql.product.ProductSize;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Giỏ hàng (plan gio-hang §5): giỏ lưu ở localStorage (D8), server chỉ tính lại theo giá / tồn kho mới nhất.
 * Không giữ chỗ, không trừ kho, không ghi DB. Giá luôn lấy từ DB (field giá client gửi kèm bị bỏ qua).
 * Dùng thẳng {@link ProductSizeRepository} như plan §7.2 (một truy vấn {@code product_size ⨝ product}).
 */
@Service
public class CartService extends BaseService<ProductSizeRepository, ProductSize, Integer> {
    public static final int MAX_LINES = 50;
    public static final int MAX_QUANTITY = 10;
    public static final String TOO_MANY_LINES = "Your bag can hold up to 50 different items.";
    public static final String INVALID_SIZE = "Invalid size in bag.";
    public static final String INVALID_QUANTITY = "Quantity must be between 1 and 10.";
    public static final String DUPLICATE_SIZE = "Each size can only appear once in the bag.";
    private static final String PUBLISHED = "PUBLISHED";

    public CartService(ProductSizeRepository repository, QueryExecutor queryExecutor) {
        super(repository, queryExecutor);
    }

    /** Tính lại giỏ: dòng theo đúng thứ tự request, trạng thái + giá + tổng (plan §5.1). */
    public CartCheck check(List<CartItem> items) {
        validate(items);
        Map<Integer, CartLine> rows = new HashMap<>();
        if (!items.isEmpty()) {
            List<Integer> sizeIds = items.stream().map(CartItem::getSizeId).toList();
            for (CartLine row : repository.listCartRows(sizeIds)) {
                rows.put(row.getSizeId(), row);
            }
        }

        List<CartLine> lines = new ArrayList<>(items.size());
        int itemCount = 0;
        long subtotal = 0;
        for (CartItem item : items) {
            CartLine line = buildLine(item, rows.get(item.getSizeId()));
            lines.add(line);
            itemCount += line.getAvailableQuantity();
            subtotal += line.getLineTotal();
        }
        long shippingFee = ShippingPolicy.feeFor(subtotal);
        return new CartCheck(lines, itemCount, subtotal, shippingFee, subtotal + shippingFee);
    }

    /**
     * Quy tắc §5.2 bước 2 → 4 (bước 1 — JSON hỏng / sai kiểu — do Jackson báo "Malformed request body").
     * Gặp lỗi đầu tiên thì dừng, chưa truy vấn DB.
     */
    void validate(List<CartItem> items) {
        if (items.size() > MAX_LINES) {
            throw new AppException(ErrorCode.BAD_REQUEST, TOO_MANY_LINES);
        }
        for (CartItem item : items) {
            if (item == null || item.getSizeId() == null || item.getSizeId() < 1) {
                throw new AppException(ErrorCode.BAD_REQUEST, INVALID_SIZE);
            }
            Integer quantity = item.getQuantity();
            if (quantity == null || quantity < 1 || quantity > MAX_QUANTITY) {
                throw new AppException(ErrorCode.BAD_REQUEST, INVALID_QUANTITY);
            }
        }
        Set<Integer> seen = new HashSet<>();
        for (CartItem item : items) {
            if (!seen.add(item.getSizeId())) {
                throw new AppException(ErrorCode.BAD_REQUEST, DUPLICATE_SIZE);
            }
        }
    }

    /** Dựng một dòng kết quả; {@code row == null} = size không tồn tại (thông tin hiển thị null hết). */
    private static CartLine buildLine(CartItem item, CartLine row) {
        CartLine line = row == null ? new CartLine() : row;
        line.setSizeId(item.getSizeId());
        line.setQuantity(item.getQuantity());

        int stock = row == null || row.getStock() == null ? 0 : row.getStock();
        String status;
        if (row == null || !PUBLISHED.equals(row.getProductStatus())) {
            status = CartLine.UNAVAILABLE;
        } else if (stock == 0) {
            status = CartLine.OUT_OF_STOCK;
        } else if (stock < item.getQuantity()) {
            status = CartLine.INSUFFICIENT_STOCK;
        } else {
            status = CartLine.AVAILABLE;
        }
        int available = switch (status) {
            case CartLine.AVAILABLE -> item.getQuantity();
            case CartLine.INSUFFICIENT_STOCK -> stock;
            default -> 0;
        };

        line.setStatus(status);
        line.setAvailableQuantity(available);
        // Không lộ tồn kho của sản phẩm ẩn / size không tồn tại
        line.setStock(CartLine.UNAVAILABLE.equals(status) ? 0 : stock);
        Long unitPrice = row == null ? null : (row.getSalePrice() != null ? row.getSalePrice() : row.getPrice());
        line.setUnitPrice(unitPrice);
        line.setLineTotal(unitPrice == null ? 0L : unitPrice * available);
        return line;
    }
}
