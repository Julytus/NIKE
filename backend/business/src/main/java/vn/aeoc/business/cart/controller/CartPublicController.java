package vn.aeoc.business.cart.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import vn.aeoc.authenticate.controller.BaseController;
import vn.aeoc.authenticate.service.auth.UserService;
import vn.aeoc.authenticate.util.Mapper;
import vn.aeoc.base.config.model.ApiResponse;
import vn.aeoc.business.cart.service.CartService;
import vn.aeoc.entity.data.mysql.cart.CartCheck;
import vn.aeoc.entity.data.mysql.cart.CartItem;

import java.util.List;

/**
 * API công khai của giỏ hàng (plan gio-hang §5): không cần token, không checkPermission.
 * Đường dẫn {@code /cart/public/...} đã được JwtAuthenticationFilter mở sẵn.
 */
@RestController
public class CartPublicController extends BaseController {
    private final CartService cartService;

    public CartPublicController(CartService cartService, UserService userService) {
        super(userService);
        this.cartService = cartService;
    }

    /** Tính lại giỏ localStorage theo giá / tồn kho mới nhất (plan gio-hang §5.1). */
    @PostMapping("/cart/public/check")
    public ResponseEntity<ApiResponse<CartCheck>> check(@RequestBody List<CartItem> items) {
        return Mapper.map(cartService.check(items), ApiResponse::okEntity);
    }
}
