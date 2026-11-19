package vn.aeoc.business.product.controller;

import org.springdoc.core.annotations.ParameterObject;
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
import vn.aeoc.business.product.service.ProductDetailService;
import vn.aeoc.entity.data.mysql.product.Product;
import vn.aeoc.entity.data.mysql.product.ProductCategory;
import vn.aeoc.entity.data.mysql.product.ProductFacets;
import vn.aeoc.entity.data.mysql.product.ProductFilter;

import java.util.List;

/**
 * API công khai của cửa hàng (plan giao-dien-nike §5): không cần token, không checkPermission.
 * Đường dẫn {@code /<x>/public/...} đã được JwtAuthenticationFilter mở sẵn.
 * Lát danh-sach-giay (1.4) thêm {@code list}, {@code facets}; lát 1.5 thêm {@code get}, {@code related}.
 */
@RestController
public class ProductPublicController extends BaseController {
    private final ProductCatalogService catalogService;
    private final ProductDetailService detailService;

    public ProductPublicController(ProductCatalogService catalogService,
                                   ProductDetailService detailService,
                                   UserService userService) {
        super(userService);
        this.catalogService = catalogService;
        this.detailService = detailService;
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

    /** Danh sách giày có lọc / sắp xếp / phân trang (plan danh-sach-giay §5.1). */
    @GetMapping("/product/public/list")
    public ResponseEntity<ApiResponse<Page<Product>>> list(@ParameterObject ProductFilter filter,
                                                           @RequestParam(defaultValue = "1") int page,
                                                           @RequestParam(defaultValue = "12") int limit) {
        return Mapper.map(catalogService.list(filter, page, limit), ApiResponse::okEntity);
    }

    /** Số sản phẩm theo từng lựa chọn lọc (plan danh-sach-giay §5.2). */
    @GetMapping("/product/public/facets")
    public ResponseEntity<ApiResponse<ProductFacets>> facets(@ParameterObject ProductFilter filter) {
        return Mapper.map(catalogService.facets(filter), ApiResponse::okEntity);
    }

    /** Chi tiết giày + 5 ảnh + lưới size có tồn kho (plan chi-tiet-giay §5.1). */
    @GetMapping("/product/public/get")
    public ResponseEntity<ApiResponse<Product>> get(@RequestParam String slug) {
        return Mapper.map(detailService.get(slug), ApiResponse::okEntity);
    }

    /** "You Might Also Like": tối đa 8 thẻ, cùng danh mục trước (plan chi-tiet-giay §5.2). */
    @GetMapping("/product/public/related")
    public ResponseEntity<ApiResponse<List<Product>>> related(@RequestParam String slug) {
        return Mapper.map(detailService.related(slug), ApiResponse::okEntity);
    }
}
