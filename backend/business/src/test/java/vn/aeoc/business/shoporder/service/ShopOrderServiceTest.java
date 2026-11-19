package vn.aeoc.business.shoporder.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import vn.aeoc.base.exception.AppException;
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
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** Plan dat-hang §9: TC-U1 → TC-U6. */
class ShopOrderServiceTest {
    private static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");
    /** 19/11/2026 14:05:09 giờ Việt Nam. */
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-11-19T07:05:09Z"), VN);

    private ShopOrderRepository repository;
    private ShopOrderItemRepository itemRepository;
    private CartService cartService;
    private ProductStockService stockService;
    private ShopOrderService service;

    @BeforeEach
    void setUp() {
        repository = mock(ShopOrderRepository.class);
        itemRepository = mock(ShopOrderItemRepository.class);
        cartService = mock(CartService.class);
        stockService = mock(ProductStockService.class);
        service = new ShopOrderService(repository, new QueryExecutor(Runnable::run), itemRepository,
                cartService, stockService, CLOCK);
    }

    private static ShopOrderItem item(Integer sizeId, Integer quantity) {
        ShopOrderItem item = new ShopOrderItem();
        item.setSizeId(sizeId);
        item.setQuantity(quantity);
        return item;
    }

    private static ShopOrder request(ShopOrderItem... items) {
        ShopOrder request = new ShopOrder();
        request.setReceiverName("Customer One");
        request.setPhone("0901234567");
        request.setAddress("12 Nguyen Hue Street");
        request.setNote("Please call before delivery.");
        request.setPaymentMethod("COD");
        request.setItems(items == null ? null : new ArrayList<>(Arrays.asList(items)));
        return request;
    }

    private static CartLine line(int sizeId, int quantity, String status, int stock, String name, String sizeLabel,
                                 long unitPrice) {
        CartLine line = new CartLine();
        line.setSizeId(sizeId);
        line.setQuantity(quantity);
        line.setStatus(status);
        line.setStock(stock);
        line.setAvailableQuantity(CartLine.AVAILABLE.equals(status) ? quantity : 0);
        line.setProductId(sizeId / 100);
        line.setSlug("slug-" + sizeId);
        line.setName(name);
        line.setSubtitle("Men's Shoes");
        line.setSizeLabel(sizeLabel);
        line.setImageUrl("http://minio/products/slug-" + sizeId + "/1.webp");
        line.setUnitPrice(unitPrice);
        line.setLineTotal(CartLine.AVAILABLE.equals(status) ? unitPrice * quantity : 0L);
        return line;
    }

    private static CartLine available(int sizeId, int quantity, long unitPrice) {
        return line(sizeId, quantity, CartLine.AVAILABLE, 20, "Name " + sizeId, "EU 42", unitPrice);
    }

    private static CartCheck checkOf(CartLine... lines) {
        int itemCount = Arrays.stream(lines).mapToInt(CartLine::getAvailableQuantity).sum();
        long subtotal = Arrays.stream(lines).mapToLong(CartLine::getLineTotal).sum();
        long fee = subtotal > 0 && subtotal < 5_000_000L ? 30_000L : 0L;
        return new CartCheck(List.of(lines), itemCount, subtotal, fee, subtotal + fee);
    }

    private void assertBadRequest(ShopOrder request, String message) {
        assertThatThrownBy(() -> service.create(34, request))
                .isInstanceOf(AppException.class)
                .hasMessage(message)
                .satisfies(e -> assertThat(((AppException) e).getStatusCode()).isEqualTo(400));
    }

    @Test
    void tcU1_thuTuValidate_khongGoiGiCaKhiLoi() {
        ShopOrder noItems = request((ShopOrderItem[]) null);
        assertBadRequest(noItems, "Your bag is empty.");
        assertBadRequest(request(), "Your bag is empty.");

        ShopOrder blankName = request(item(1305, 1));
        blankName.setReceiverName("  ");
        assertBadRequest(blankName, "Please enter the recipient's name.");

        ShopOrder noPhone = request(item(1305, 1));
        noPhone.setPhone(null);
        assertBadRequest(noPhone, "Please enter a phone number.");

        ShopOrder emptyAddress = request(item(1305, 1));
        emptyAddress.setAddress("");
        assertBadRequest(emptyAddress, "Please enter a delivery address.");

        ShopOrder payos = request(item(1305, 1));
        payos.setPaymentMethod("PAYOS");
        assertBadRequest(payos, "This payment method is not available.");

        ShopOrder nameFirst = request(item(1305, 11));
        nameFirst.setReceiverName("");
        assertBadRequest(nameFirst, "Please enter the recipient's name.");

        verifyNoInteractions(cartService, stockService, repository, itemRepository);
    }

    @Test
    void tcU2_dongKhongMuaDuoc_khongTruKhoKhongGhi() {
        when(cartService.check(anyList())).thenReturn(checkOf(
                line(201, 1, CartLine.OUT_OF_STOCK, 0, "Nike Dunk Low Retro", "EU 38.5", 3_519_000L)));
        assertBadRequest(request(item(201, 1)), "Nike Dunk Low Retro (EU 38.5) is sold out. Please update your bag.");

        when(cartService.check(anyList())).thenReturn(checkOf(
                line(1805, 4, CartLine.INSUFFICIENT_STOCK, 3, "Nike Vaporfly 4", "EU 38", 6_609_000L)));
        assertBadRequest(request(item(1805, 4)), "Only 3 left of Nike Vaporfly 4 (EU 38). Please update your bag.");

        when(cartService.check(anyList())).thenReturn(checkOf(
                available(1304, 1, 1_909_000L),
                line(3106, 1, CartLine.UNAVAILABLE, 0, null, null, 0L),
                line(201, 1, CartLine.OUT_OF_STOCK, 0, "Nike Dunk Low Retro", "EU 38.5", 3_519_000L)));
        assertBadRequest(request(item(1304, 1), item(3106, 1), item(201, 1)),
                "An item in your bag is no longer available. Please update your bag.");

        verify(stockService, never()).decrease(anyInt(), anyInt());
        verify(repository, never()).insertReturning(any());
        verify(itemRepository, never()).insertAll(anyList());
    }

    @Test
    @SuppressWarnings("unchecked")
    void tcU3_taoDonThanhCong() {
        when(cartService.check(anyList())).thenReturn(new CartCheck(List.of(
                available(1906, 2, 2_000_000L),
                available(206, 1, 3_519_000L),
                available(1305, 1, 1_909_000L)), 4, 9_428_000L, 0L, 9_428_000L));
        when(stockService.decrease(anyInt(), anyInt())).thenReturn(true);
        when(repository.insertReturning(any())).thenAnswer(inv -> {
            ShopOrder inserted = inv.getArgument(0);
            ShopOrder copy = new ShopOrder();
            copy.setId(7);
            copy.setUserId(inserted.getUserId());
            return copy;
        });
        ShopOrder saved = new ShopOrder();
        saved.setId(7);
        saved.setUserId(34);
        saved.setCode("DH2611190007");
        when(repository.getByCode("DH2611190007")).thenReturn(saved);
        when(itemRepository.listByOrder(7)).thenReturn(List.of(new ShopOrderItem()));

        ShopOrder request = request(item(1906, 2), item(206, 1), item(1305, 1));
        request.setId(999);
        request.setStatus("DELIVERED");
        request.setTotal(1L);
        ShopOrder result = service.create(34, request);

        ArgumentCaptor<List<CartItem>> cartItems = ArgumentCaptor.forClass(List.class);
        verify(cartService).check(cartItems.capture());
        assertThat(cartItems.getValue()).extracting(CartItem::getSizeId).containsExactly(1906, 206, 1305);

        InOrder order = inOrder(stockService);
        order.verify(stockService).decrease(206, 1);
        order.verify(stockService).decrease(1305, 1);
        order.verify(stockService).decrease(1906, 2);

        ArgumentCaptor<ShopOrder> inserted = ArgumentCaptor.forClass(ShopOrder.class);
        verify(repository).insertReturning(inserted.capture());
        ShopOrder o = inserted.getValue();
        assertThat(o.getId()).isNull();
        assertThat(o.getCode()).isNull();
        assertThat(o.getUserId()).isEqualTo(34);
        assertThat(o.getStatus()).isEqualTo("PLACED");
        assertThat(o.getPaymentMethod()).isEqualTo("COD");
        assertThat(o.getItemCount()).isEqualTo(4);
        assertThat(o.getSubtotal()).isEqualTo(9_428_000L);
        assertThat(o.getShippingFee()).isZero();
        assertThat(o.getTotal()).isEqualTo(9_428_000L);
        assertThat(o.getCreatedTime()).isEqualTo(LocalDateTime.of(2026, 11, 19, 14, 5, 9));
        assertThat(o.getUpdatedTime()).isEqualTo(o.getCreatedTime());
        assertThat(o.getReceiverName()).isEqualTo("Customer One");

        verify(repository).updateCode(7, "DH2611190007");

        ArgumentCaptor<List<ShopOrderItem>> items = ArgumentCaptor.forClass(List.class);
        verify(itemRepository).insertAll(items.capture());
        assertThat(items.getValue()).extracting(ShopOrderItem::getSizeId).containsExactly(1906, 206, 1305);
        ShopOrderItem first = items.getValue().get(0);
        assertThat(first.getOrderId()).isEqualTo(7);
        assertThat(first.getProductId()).isEqualTo(19);
        assertThat(first.getProductSlug()).isEqualTo("slug-1906");
        assertThat(first.getProductName()).isEqualTo("Name 1906");
        assertThat(first.getProductSubtitle()).isEqualTo("Men's Shoes");
        assertThat(first.getSizeLabel()).isEqualTo("EU 42");
        assertThat(first.getImageUrl()).isEqualTo("http://minio/products/slug-1906/1.webp");
        assertThat(first.getUnitPrice()).isEqualTo(2_000_000L);
        assertThat(first.getQuantity()).isEqualTo(2);
        assertThat(first.getLineTotal()).isEqualTo(4_000_000L);

        assertThat(result.getCode()).isEqualTo("DH2611190007");
        assertThat(result.getItems()).hasSize(1);
    }

    @Test
    void tcU4_truKhoThatBai_baoTheoTrangThaiMoi_khongGhiDon() {
        when(cartService.check(anyList()))
                .thenReturn(checkOf(available(206, 1, 3_519_000L), available(1306, 1, 1_909_000L)))
                .thenReturn(checkOf(line(1306, 1, CartLine.OUT_OF_STOCK, 0, "Nike Revolution 8", "EU 42", 1_909_000L)));
        when(stockService.decrease(206, 1)).thenReturn(true);
        when(stockService.decrease(1306, 1)).thenReturn(false);

        assertBadRequest(request(item(206, 1), item(1306, 1)),
                "Nike Revolution 8 (EU 42) is sold out. Please update your bag.");

        verify(repository, never()).insertReturning(any());
        verify(repository, never()).updateCode(anyInt(), anyString());
        verify(itemRepository, never()).insertAll(anyList());
    }

    @Test
    void tcU5_sinhMa() {
        LocalDateTime time = LocalDateTime.of(2026, 11, 19, 14, 5, 9);
        assertThat(ShopOrderService.codeOf(time, 7)).isEqualTo("DH2611190007");
        assertThat(ShopOrderService.codeOf(time, 12345)).isEqualTo("DH2611192345");
        assertThat(ShopOrderService.codeOf(LocalDateTime.of(2026, 1, 2, 0, 0, 1), 10000)).isEqualTo("DH2601020000");
    }

    @Test
    void tcU6_get_chiChuDon() {
        ShopOrder order = new ShopOrder();
        order.setId(7);
        order.setUserId(34);
        order.setCode("DH2611190007");
        when(repository.getByCode("DH2611190007")).thenReturn(order);
        when(itemRepository.listByOrder(7)).thenReturn(List.of(new ShopOrderItem(), new ShopOrderItem()));

        assertThatThrownBy(() -> service.get(35, "DH2611190007"))
                .isInstanceOf(AppException.class)
                .hasMessage("Order not found.")
                .satisfies(e -> assertThat(((AppException) e).getStatusCode()).isEqualTo(404));
        assertThatThrownBy(() -> service.get(34, "DH0000000000"))
                .isInstanceOf(AppException.class)
                .hasMessage("Order not found.");
        verify(itemRepository, never()).listByOrder(any());

        ShopOrder mine = service.get(34, "DH2611190007");
        assertThat(mine.getItems()).hasSize(2);
        verify(itemRepository).listByOrder(eq(7));
    }
}
