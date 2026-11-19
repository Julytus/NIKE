package vn.aeoc.business.shoporder.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.aeoc.authenticate.controller.BaseController;
import vn.aeoc.authenticate.service.auth.UserService;
import vn.aeoc.authenticate.util.Mapper;
import vn.aeoc.authenticate.util.SecurityUtils;
import vn.aeoc.base.config.model.ApiResponse;
import vn.aeoc.business.shoporder.service.ShopOrderService;
import vn.aeoc.entity.data.mysql.shoporder.ShopOrder;

import java.security.Principal;

/**
 * Đơn hàng của khách đã đăng nhập (plan dat-hang §2, §5): chỉ cần token hợp lệ (JwtAuthenticationFilter chặn khi
 * thiếu), không checkPermission, không resource; mỗi người chỉ thấy đơn của mình.
 */
@RestController
public class ShopOrderController extends BaseController {
    private static final String URI = "/shop-order/";

    private final ShopOrderService shopOrderService;

    public ShopOrderController(ShopOrderService shopOrderService, UserService userService) {
        super(userService);
        this.shopOrderService = shopOrderService;
    }

    /** Đặt hàng COD (plan §5.1). */
    @PostMapping(URI + "create")
    public ResponseEntity<ApiResponse<ShopOrder>> create(@RequestBody ShopOrder request, Principal principal) {
        return Mapper.map(shopOrderService.create(SecurityUtils.userId(principal), request), ApiResponse::okEntity);
    }

    /** Xem một đơn của chính mình theo mã (plan §5.2). */
    @GetMapping(URI + "get")
    public ResponseEntity<ApiResponse<ShopOrder>> get(@RequestParam String code, Principal principal) {
        return Mapper.map(shopOrderService.get(SecurityUtils.userId(principal), code), ApiResponse::okEntity);
    }
}
