package vn.aeoc.app;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import vn.aeoc.business.product.repository.ProductImageRepository;
import vn.aeoc.business.product.repository.ProductRepository;
import vn.aeoc.business.product.repository.ProductSizeRepository;
import vn.aeoc.business.product.seed.ShoeSeedData;
import vn.aeoc.business.product.seed.ShoeSeedService;
import vn.aeoc.business.testsupport.SeedSummary;
import vn.aeoc.entity.data.mysql.product.Product;
import vn.aeoc.entity.data.mysql.product.ProductSize;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static vn.entity.backend.tables.Product.PRODUCT;
import static vn.entity.backend.tables.ProductSize.PRODUCT_SIZE;

/**
 * TC-U7 (plan du-lieu-giay §9): reset khôi phục dữ liệu mẫu sau khi bị đổi. Đặt ở module app vì cần
 * {@code @SpringBootApplication}; chạy trên DB local (backend/.env, MySQL + MinIO Docker phải đang chạy),
 * kết thúc bằng reset nên DB trở lại đúng products.json.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
class ShoeSeedResetTest {
    @Autowired
    private ShoeSeedService shoeSeedService;
    @Autowired
    private ProductRepository productRepository;
    @Autowired
    private ProductImageRepository imageRepository;
    @Autowired
    private ProductSizeRepository sizeRepository;

    @Test
    void tcU7_resetKhoiPhucSauKhiDuLieuBiDoi() {
        ShoeSeedData data = ShoeSeedData.load();
        shoeSeedService.reset();

        sizeRepository.updateFieldByCondition(PRODUCT_SIZE.ID.eq(101), PRODUCT_SIZE.STOCK, 0);
        productRepository.updateFieldByCondition(PRODUCT.ID.eq(2), PRODUCT.PRICE, 123_000L);
        productRepository.delete(3);
        Product extra = new Product();
        extra.setId(99);
        extra.setSlug("giay-them-tay");
        extra.setStyleCode("TEST-99");
        extra.setName("Giay them tay");
        extra.setSubtitle("Giày nam");
        extra.setGender("MEN");
        extra.setCategoryId(1);
        extra.setDescription("x");
        extra.setPrice(1_000_000L);
        extra.setStatus("PUBLISHED");
        extra.setCreatedTime(LocalDateTime.now());
        extra.setUpdatedTime(LocalDateTime.now());
        productRepository.insert(extra);
        assertNotNull(productRepository.getById(99));

        SeedSummary summary = shoeSeedService.reset();

        ProductSize size101 = sizeRepository.getById(101);
        ProductSize expected101 = data.sizes().stream().filter(s -> s.getId() == 101).findFirst().orElseThrow();
        assertEquals(expected101.getStock(), size101.getStock());
        Product expected2 = data.products().stream().filter(p -> p.getId() == 2).findFirst().orElseThrow();
        assertEquals(expected2.getPrice(), productRepository.getById(2).getPrice());
        assertNotNull(productRepository.getById(3));
        assertEquals(5, imageRepository.listByProduct(3).size());
        assertEquals(data.sizes().stream().filter(s -> s.getProductId() == 3).count(),
                sizeRepository.listByProduct(3).size());
        assertFalse(productRepository.existsById(99));

        assertEquals(data.categories().size(), summary.categories());
        assertEquals(data.products().size(), summary.products());
        assertEquals(data.products().stream().filter(p -> "PUBLISHED".equals(p.getStatus())).count(),
                summary.publishedProducts());
        assertEquals(data.images().size(), summary.images());
        assertEquals(0, summary.missingImages());
        assertEquals(data.sizes().size(), summary.sizes());
        assertEquals(data.sizes().stream().filter(s -> s.getStock() == 0).count(), summary.outOfStockSizes());
        assertEquals(data.sizes().stream().mapToLong(ProductSize::getStock).sum(), summary.totalStock());
        assertNotNull(summary.resetAt());
    }
}
