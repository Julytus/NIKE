package vn.aeoc.business.testsupport;

import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import vn.aeoc.authenticate.controller.BaseController;
import vn.aeoc.authenticate.service.auth.UserService;
import vn.aeoc.authenticate.util.Mapper;
import vn.aeoc.base.config.model.ApiResponse;
import vn.aeoc.business.product.seed.ShoeSeedService;
import vn.aeoc.business.product.service.ProductStockService;
import vn.aeoc.entity.data.mysql.product.ProductSize;

import java.security.Principal;

/**
 * API hỗ trợ automation test (plan du-lieu-giay §5): chỉ có ở profile local / test.
 * Không có dòng resource cho URI này nên chỉ role operator (hoặc API key) qua được checkPermission.
 */
@RestController
@Profile({"local", "test"})
public class TestSupportController extends BaseController {
    private static final String URI = "/test-support/";

    private final ShoeSeedService shoeSeedService;
    private final ProductStockService productStockService;

    public TestSupportController(ShoeSeedService shoeSeedService, ProductStockService productStockService,
                                 UserService userService) {
        super(userService);
        this.shoeSeedService = shoeSeedService;
        this.productStockService = productStockService;
    }

    @GetMapping(URI + "summary")
    public ResponseEntity<ApiResponse<SeedSummary>> summary(Principal principal) {
        checkPermission(principal, URI, "VIEW");
        return Mapper.map(shoeSeedService.summary(), ApiResponse::okEntity);
    }

    @PostMapping(URI + "reset")
    public ResponseEntity<ApiResponse<SeedSummary>> reset(Principal principal) {
        checkPermission(principal, URI, "UPDATE");
        return Mapper.map(shoeSeedService.reset(), ApiResponse::okEntity);
    }

    /** Đặt tồn kho một size để chuẩn bị dữ liệu test (plan dat-hang §5.4); chỉ đọc {@code id}, {@code stock}. */
    @PostMapping(URI + "stock")
    public ResponseEntity<ApiResponse<ProductSize>> stock(@RequestBody ProductSize request, Principal principal) {
        checkPermission(principal, URI, "UPDATE");
        return Mapper.map(productStockService.setStock(request), ApiResponse::okEntity);
    }
}
