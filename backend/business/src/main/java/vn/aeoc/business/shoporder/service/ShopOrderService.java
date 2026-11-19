package vn.aeoc.business.shoporder.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import vn.aeoc.base.constant.ErrorCode;
import vn.aeoc.base.exception.AppException;
import vn.aeoc.base.service.BaseService;
import vn.aeoc.base.util.QueryExecutor;
import vn.aeoc.business.cart.service.CartService;
import vn.aeoc.business.product.service.ProductStockService;
import vn.aeoc.business.shoporder.repository.ShopOrderItemRepository;
import vn.aeoc.business.shoporder.repository.ShopOrderRepository;
import vn.aeoc.entity.data.mysql.cart.CartCheck;
import vn.aeoc.entity.data.mysql.cart.CartItem;
import vn.aeoc.entity.data.mysql.cart.CartLine;
import vn.aeoc.entity.data.mysql.shoporder.ShopOrder;
import vn.aeoc.entity.data.mysql.shoporder.ShopOrderItem;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;

/**
 * Đặt hàng COD (plan dat-hang §5): kiểm theo đúng thứ tự §5.3, giá / tổng tính lại từ DB qua {@link CartService},
 * trừ kho có điều kiện qua {@link ProductStockService} trong cùng transaction với việc ghi đơn, sinh mã
 * {@code DH} + yyMMdd + {@code id % 10000}, chụp lại thông tin sản phẩm vào dòng đơn.
 */
@Service
public class ShopOrderService extends BaseService<ShopOrderRepository, ShopOrder, Integer> {
    public static final String EMPTY_BAG = "Your bag is empty.";
    public static final String MISSING_NAME = "Please enter the recipient's name.";
    public static final String MISSING_PHONE = "Please enter a phone number.";
    public static final String MISSING_ADDRESS = "Please enter a delivery address.";
    public static final String INVALID_PAYMENT = "This payment method is not available.";
    public static final String UNAVAILABLE = "An item in your bag is no longer available. Please update your bag.";
    public static final String NOT_FOUND = "Order not found.";

    private static final ZoneId DEFAULT_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter CODE_DATE = DateTimeFormatter.ofPattern("yyMMdd");

    private final ShopOrderItemRepository itemRepository;
    private final CartService cartService;
    private final ProductStockService stockService;
    private final Clock clock;

    @Autowired
    public ShopOrderService(ShopOrderRepository repository, QueryExecutor queryExecutor,
                            ShopOrderItemRepository itemRepository, CartService cartService,
                            ProductStockService stockService) {
        this(repository, queryExecutor, itemRepository, cartService, stockService, Clock.system(DEFAULT_ZONE));
    }

    /** Cho unit test truyền {@link Clock} cố định. */
    public ShopOrderService(ShopOrderRepository repository, QueryExecutor queryExecutor,
                            ShopOrderItemRepository itemRepository, CartService cartService,
                            ProductStockService stockService, Clock clock) {
        super(repository, queryExecutor);
        this.itemRepository = itemRepository;
        this.cartService = cartService;
        this.stockService = stockService;
        this.clock = clock;
    }

    /**
     * Tạo đơn của {@code userId} (plan §5.1, §5.3). Bước 2–6 không ghi DB; lỗi ở bước 7–8 làm transaction
     * rollback (dòng đã trừ kho được trả lại). READ_COMMITTED để lần kiểm lại sau khi trừ kho thất bại
     * (bước 7) đọc được tồn kho mới nhất mà đơn thắng vừa commit, không phải snapshot đầu transaction.
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public ShopOrder create(Integer userId, ShopOrder request) {
        List<ShopOrderItem> requested = request.getItems();
        if (requested == null || requested.isEmpty()) {
            throw badRequest(EMPTY_BAG);
        }
        String receiverName = trim(request.getReceiverName());
        if (receiverName == null) {
            throw badRequest(MISSING_NAME);
        }
        String phone = trim(request.getPhone());
        if (phone == null) {
            throw badRequest(MISSING_PHONE);
        }
        String address = trim(request.getAddress());
        if (address == null) {
            throw badRequest(MISSING_ADDRESS);
        }
        if (!ShopOrder.PAYMENT_COD.equals(request.getPaymentMethod())) {
            throw badRequest(INVALID_PAYMENT);
        }

        // Bước 5: luật giỏ (số dòng, size, số lượng, trùng) rồi mới truy vấn DB; giá luôn lấy từ DB.
        List<CartItem> cartItems = requested.stream()
                .map(item -> item == null ? null : new CartItem(item.getSizeId(), item.getQuantity()))
                .toList();
        CartCheck check = cartService.check(cartItems);

        // Bước 6: dòng đầu tiên (theo thứ tự request) không mua được.
        for (CartLine line : check.getItems()) {
            if (!CartLine.AVAILABLE.equals(line.getStatus())) {
                throw badRequest(lineError(line));
            }
        }

        // Bước 7: trừ kho theo sizeId tăng dần (hai đơn khoá cùng thứ tự → không deadlock).
        List<CartLine> bySize = check.getItems().stream()
                .sorted(Comparator.comparing(CartLine::getSizeId))
                .toList();
        for (CartLine line : bySize) {
            if (!stockService.decrease(line.getSizeId(), line.getQuantity())) {
                throw badRequest(recheckError(line));
            }
        }

        // Bước 8: ghi đơn (field do server quản ghi đè hết) → mã → dòng chụp lại.
        LocalDateTime now = LocalDateTime.now(clock).truncatedTo(ChronoUnit.SECONDS);
        ShopOrder order = new ShopOrder();
        order.setUserId(userId);
        order.setReceiverName(receiverName);
        order.setPhone(phone);
        order.setAddress(address);
        order.setNote(trim(request.getNote()));
        order.setItemCount(check.getItemCount());
        order.setSubtotal(check.getSubtotal());
        order.setShippingFee(check.getShippingFee());
        order.setTotal(check.getTotal());
        order.setPaymentMethod(ShopOrder.PAYMENT_COD);
        order.setStatus(ShopOrder.STATUS_PLACED);
        order.setCreatedTime(now);
        order.setUpdatedTime(now);
        Integer orderId = insert(order).getId();
        String code = codeOf(now, orderId);
        repository.updateCode(orderId, code);

        List<ShopOrderItem> items = check.getItems().stream()
                .map(line -> snapshot(orderId, line))
                .toList();
        itemRepository.insertAll(items);
        return get(userId, code);
    }

    /** Đơn của chính {@code userId}; không có / của người khác / mã rỗng → 404 (plan §5.2). */
    public ShopOrder get(Integer userId, String code) {
        String trimmed = trim(code);
        ShopOrder order = trimmed == null ? null : repository.getByCode(trimmed);
        if (order == null || !order.getUserId().equals(userId)) {
            throw new AppException(ErrorCode.DATA_NOT_FOUND, NOT_FOUND);
        }
        order.setItems(itemRepository.listByOrder(order.getId()));
        return order;
    }

    /** Xoá mọi dòng đơn rồi mọi đơn — cho {@code test-support/reset} (xoá trước bảng sản phẩm). */
    public void deleteAll() {
        itemRepository.deleteAll();
        repository.deleteAll();
    }

    /** "DH" + yyMMdd + 4 số cuối của id, vd (19/11/2026, 7) → "DH2611190007". */
    static String codeOf(LocalDateTime time, int id) {
        return "DH" + time.format(CODE_DATE) + String.format("%04d", id % 10000);
    }

    /**
     * Trừ kho thất bại (bị người khác mua trước): kiểm lại riêng dòng đó để báo đúng trạng thái mới.
     * Nếu lần kiểm lại vẫn thấy đủ hàng (kho vừa được bù) thì vẫn báo hết hàng — khách bấm lại là đặt được.
     */
    private String recheckError(CartLine line) {
        CartLine fresh = cartService.check(List.of(new CartItem(line.getSizeId(), line.getQuantity())))
                .getItems().get(0);
        if (CartLine.AVAILABLE.equals(fresh.getStatus())) {
            fresh.setStatus(CartLine.OUT_OF_STOCK);
        }
        return lineError(fresh);
    }

    private static String lineError(CartLine line) {
        return switch (line.getStatus()) {
            case CartLine.OUT_OF_STOCK ->
                    line.getName() + " (" + line.getSizeLabel() + ") is sold out. Please update your bag.";
            case CartLine.INSUFFICIENT_STOCK -> "Only " + line.getStock() + " left of " + line.getName()
                    + " (" + line.getSizeLabel() + "). Please update your bag.";
            default -> UNAVAILABLE;
        };
    }

    private static ShopOrderItem snapshot(Integer orderId, CartLine line) {
        ShopOrderItem item = new ShopOrderItem();
        item.setOrderId(orderId);
        item.setSizeId(line.getSizeId());
        item.setProductId(line.getProductId());
        item.setProductSlug(line.getSlug());
        item.setProductName(line.getName());
        item.setProductSubtitle(line.getSubtitle());
        item.setSizeLabel(line.getSizeLabel());
        item.setImageUrl(line.getImageUrl());
        item.setUnitPrice(line.getUnitPrice());
        item.setQuantity(line.getQuantity());
        item.setLineTotal(line.getLineTotal());
        return item;
    }

    private static AppException badRequest(String message) {
        return new AppException(ErrorCode.BAD_REQUEST, message);
    }

    private static String trim(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
