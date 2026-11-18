package vn.aeoc.business.product.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.aeoc.authenticate.controller.BaseController;
import vn.aeoc.authenticate.service.auth.UserService;
import vn.aeoc.authenticate.util.Mapper;
import vn.aeoc.base.config.extention.paging.Page;
import vn.aeoc.base.config.model.ApiResponse;
import vn.aeoc.business.product.service.ProductCatalogService;
import vn.aeoc.entity.data.mysql.product.Product;
import vn.aeoc.entity.data.mysql.product.ProductCategory;

import java.util.List;

/**
 * API công khai của cửa hàng (plan giao-dien-nike §5): không cần token, không checkPermission.
 * Đường dẫn {@code /<x>/public/...} đã được JwtAuthenticationFilter mở sẵn.
 * Lát 1.4 / 1.5 thêm {@code list}, {@code get}, {@code related} vào controller này.
 */
@RestController
public class ProductPublicController extends BaseController {
    private final ProductCatalogService catalogService;

    public ProductPublicController(ProductCatalogService catalogService, UserService userService) {
        super(userService);
        this.catalogService = catalogService;
    }

    @GetMapping("/product-category/public/list")
    public ResponseEntity<ApiResponse<List<ProductCategory>>> categories() {
        return Mapper.map(catalogService.categories(), ApiResponse::okEntity);
    }

    @GetMapping("/product/public/new-arrivals")
    public ResponseEntity<ApiResponse<List<Product>>> newArrivals() {
        return Mapper.map(catalogService.newArrivals(), ApiResponse::okEntity);
    }

    @GetMapping("/product/public/suggest")
    public ResponseEntity<ApiResponse<Page<Product>>> suggest(@RequestParam(required = false) String q) {
        return Mapper.map(catalogService.suggest(q), ApiResponse::okEntity);
    }
}
