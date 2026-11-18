package vn.aeoc.business.product.service;

import org.jooq.Condition;
import org.springframework.stereotype.Service;
import vn.aeoc.base.config.extention.paging.Page;
import vn.aeoc.base.config.extention.paging.Pageable;
import vn.aeoc.base.service.BaseService;
import vn.aeoc.base.util.QueryExecutor;
import vn.aeoc.business.product.repository.ProductCategoryRepository;
import vn.aeoc.business.product.repository.ProductRepository;
import vn.aeoc.entity.data.mysql.product.Product;
import vn.aeoc.entity.data.mysql.product.ProductCategory;

import java.util.List;

import static vn.entity.backend.tables.Product.PRODUCT;

/**
 * Dữ liệu công khai cho khung cửa hàng (plan giao-dien-nike §5): danh mục, "Mới về", gợi ý tìm kiếm.
 * Không cache: dữ liệu nhỏ, và test-support/reset đổi dữ liệu giữa các lần chạy test.
 */
@Service
public class ProductCatalogService extends BaseService<ProductRepository, Product, Integer> {
    public static final int NEW_ARRIVALS_LIMIT = 12;
    public static final int SUGGEST_LIMIT = 6;
    static final String BADGE_JUST_IN = "JUST_IN";

    private final ProductCategoryRepository categoryRepository;

    public ProductCatalogService(ProductRepository repository,
                                 ProductCategoryRepository categoryRepository,
                                 QueryExecutor queryExecutor) {
        super(repository, queryExecutor);
        this.categoryRepository = categoryRepository;
    }

    public List<ProductCategory> categories() {
        return categoryRepository.listWithStats();
    }

    public List<Product> newArrivals() {
        return repository.listCards(
                repository.publishedCondition().and(PRODUCT.BADGE.eq(BADGE_JUST_IN)),
                NEW_ARRIVALS_LIMIT);
    }

    /** Từ khoá rỗng (sau trim) → trang rỗng, không truy vấn DB. */
    public Page<Product> suggest(String q) {
        String keyword = q == null ? "" : q.trim();
        Pageable pageable = new Pageable().setLimit(SUGGEST_LIMIT);
        if (keyword.isEmpty()) {
            return new Page<>(0L, pageable.getPage(), List.of());
        }
        Condition condition = repository.publishedCondition().and(repository.keywordCondition(keyword));
        return pageQuery(pageable,
                () -> repository.listCards(condition, SUGGEST_LIMIT),
                () -> repository.countCards(condition));
    }
}
