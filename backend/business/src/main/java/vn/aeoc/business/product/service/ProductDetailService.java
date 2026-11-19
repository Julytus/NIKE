package vn.aeoc.business.product.service;

import org.springframework.stereotype.Service;
import vn.aeoc.base.constant.ErrorCode;
import vn.aeoc.base.exception.AppException;
import vn.aeoc.base.service.BaseService;
import vn.aeoc.base.util.QueryExecutor;
import vn.aeoc.business.product.repository.ProductImageRepository;
import vn.aeoc.business.product.repository.ProductRepository;
import vn.aeoc.business.product.repository.ProductSizeRepository;
import vn.aeoc.entity.data.mysql.product.Product;

import java.util.List;
import java.util.Locale;

/**
 * Trang chi tiết giày (plan chi-tiet-giay §5): chi tiết một sản phẩm đang bán (kèm 5 ảnh + lưới size có tồn kho)
 * và "You Might Also Like". Tách khỏi {@link ProductCatalogService} để không đổi constructor / test cũ.
 * Sản phẩm HIDDEN / DRAFT coi như không tồn tại (404), kể cả với quản trị.
 */
@Service
public class ProductDetailService extends BaseService<ProductRepository, Product, Integer> {
    public static final int RELATED_LIMIT = 8;
    public static final String PRODUCT_NOT_FOUND = "Product not found";

    private final ProductImageRepository imageRepository;
    private final ProductSizeRepository sizeRepository;

    public ProductDetailService(ProductRepository repository,
                                ProductImageRepository imageRepository,
                                ProductSizeRepository sizeRepository,
                                QueryExecutor queryExecutor) {
        super(repository, queryExecutor);
        this.imageRepository = imageRepository;
        this.sizeRepository = sizeRepository;
    }

    /** Chi tiết: thẻ sản phẩm + {@code images} (theo sort_order) + {@code sizes} (theo size_value). */
    public Product get(String slug) {
        Product product = findPublished(slug);
        product.setImages(imageRepository.listByProduct(product.getId()));
        product.setSizes(sizeRepository.listByProduct(product.getId()));
        return product;
    }

    /** Tối đa 8 thẻ: cùng danh mục trước, thiếu thì bù danh mục khác; không có chính nó. */
    public List<Product> related(String slug) {
        Product product = findPublished(slug);
        return repository.listRelated(product.getId(), product.getCategoryId(), RELATED_LIMIT);
    }

    /**
     * Sản phẩm đang bán theo slug đã {@code trim} + chữ thường. Rỗng → 404 ngay, không truy vấn DB.
     */
    Product findPublished(String slug) {
        String normalized = slug == null ? "" : slug.trim().toLowerCase(Locale.ROOT);
        if (normalized.isEmpty()) {
            throw new AppException(ErrorCode.DATA_NOT_FOUND, PRODUCT_NOT_FOUND);
        }
        Product product = repository.getPublishedBySlug(normalized);
        if (product == null) {
            throw new AppException(ErrorCode.DATA_NOT_FOUND, PRODUCT_NOT_FOUND);
        }
        return product;
    }
}
