package vn.aeoc.business.product.seed;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import vn.aeoc.authenticate.service.FileStorageService;
import vn.aeoc.base.service.BaseService;
import vn.aeoc.base.util.QueryExecutor;
import vn.aeoc.business.product.repository.ProductCategoryRepository;
import vn.aeoc.business.product.repository.ProductImageRepository;
import vn.aeoc.business.product.repository.ProductRepository;
import vn.aeoc.business.product.repository.ProductSizeRepository;
import vn.aeoc.business.shoporder.service.ShopOrderService;
import vn.aeoc.business.testsupport.SeedSummary;
import vn.aeoc.entity.data.mysql.product.Product;
import vn.aeoc.entity.data.mysql.product.ProductImage;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Nạp dữ liệu mẫu cửa hàng giày từ {@code products.json} vào DB và đẩy ảnh lên MinIO (plan du-lieu-giay §3, §7).
 * Phần DB chạy trong một transaction; phần MinIO ngoài transaction, lỗi chỉ ghi log cảnh báo.
 * Seed / reset giữ một khoá để hai lần reset song song không đan xen DELETE / INSERT.
 * <p>Các lát sau thêm bảng tham chiếu {@code product} / {@code product_size} (giỏ, đơn, yêu thích) phải mở rộng
 * {@link #reloadDatabase()}: xoá bảng con trước. Lát dat-hang: reset xoá luôn toàn bộ đơn
 * ({@code shop_order_item}, {@code shop_order}) trước bảng sản phẩm.
 */
@Slf4j
@Service
public class ShoeSeedService extends BaseService<ProductRepository, Product, Integer> {
    private static final String WEBP = "image/webp";
    private static final DateTimeFormatter RESET_AT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    private final ProductCategoryRepository categoryRepository;
    private final ProductImageRepository imageRepository;
    private final ProductSizeRepository sizeRepository;
    private final ShopOrderService shopOrderService;
    private final FileStorageService fileStorageService;
    private final TransactionTemplate transactionTemplate;
    /** {@code {system.file-url}/{minio.bucket}}: cùng công thức URL với {@link FileStorageService#putPublic}. */
    private final String imageBaseUrl;
    /** Đọc một lần khi tạo bean: JSON sai → app không khởi động (plan §3 E4). */
    private final ShoeSeedData data = ShoeSeedData.load();
    private final ReentrantLock lock = new ReentrantLock();

    public ShoeSeedService(ProductRepository repository, QueryExecutor queryExecutor,
                           ProductCategoryRepository categoryRepository,
                           ProductImageRepository imageRepository,
                           ProductSizeRepository sizeRepository,
                           ShopOrderService shopOrderService,
                           FileStorageService fileStorageService,
                           TransactionTemplate transactionTemplate,
                           @Value("${system.file-url}") String fileUrl,
                           @Value("${minio.bucket}") String bucket) {
        super(repository, queryExecutor);
        this.categoryRepository = categoryRepository;
        this.imageRepository = imageRepository;
        this.sizeRepository = sizeRepository;
        this.shopOrderService = shopOrderService;
        this.fileStorageService = fileStorageService;
        this.transactionTemplate = transactionTemplate;
        this.imageBaseUrl = StringUtils.removeEnd(fileUrl, "/") + "/" + bucket;
    }

    /** Nạp DB khi bảng danh mục trống (lần đầu khởi động). Đã có dữ liệu thì giữ nguyên. */
    public boolean seedIfEmpty() {
        lock.lock();
        try {
            if (!categoryRepository.isEmpty()) {
                log.info("Seed giày: đã có dữ liệu, bỏ qua");
                return false;
            }
            transactionTemplate.executeWithoutResult(status -> insertAll());
            log.info("Seed giày: nạp {} sản phẩm", data.products().size());
            return true;
        } finally {
            lock.unlock();
        }
    }

    /** Xoá sạch 4 bảng sản phẩm rồi nạp lại từ JSON, đẩy ảnh còn thiếu, trả số liệu kèm thời điểm reset. */
    public SeedSummary reset() {
        lock.lock();
        try {
            transactionTemplate.executeWithoutResult(status -> reloadDatabase());
            pushMissingImages();
            return summary().withResetAt(LocalDateTime.now().truncatedTo(ChronoUnit.SECONDS).format(RESET_AT));
        } finally {
            lock.unlock();
        }
    }

    /**
     * Đẩy lên MinIO các ảnh {@code products/<slug>/<n>.webp} chưa có. Lỗi MinIO (vd chưa chạy) chỉ ghi cảnh báo,
     * dừng ở ảnh lỗi đầu tiên; lần khởi động / reset sau đẩy tiếp.
     */
    public int pushMissingImages() {
        int pushed = 0;
        for (ShoeSeedData.SeedImage image : data.images()) {
            try {
                if (fileStorageService.existsPublic(image.objectKey())) continue;
                byte[] bytes = readClasspath(image.classpathLocation());
                fileStorageService.putPublic(image.objectKey(), new ByteArrayInputStream(bytes), bytes.length, WEBP);
                pushed++;
            } catch (Exception e) {
                log.warn("Seed giày: không đẩy được ảnh {} lên MinIO, dừng đẩy ảnh: {}", image.objectKey(),
                        e.getMessage());
                break;
            }
        }
        log.info("Seed giày: đẩy {} ảnh lên MinIO", pushed);
        return pushed;
    }

    /** Số liệu hiện tại của dữ liệu cửa hàng (plan §5.1). */
    public SeedSummary summary() {
        Map<String, Integer> byGender = new LinkedHashMap<>();
        ShoeSeedData.GENDERS.forEach(g -> byGender.put(g, 0));
        byGender.putAll(repository.countPublishedByGender());

        return new SeedSummary(
                categoryRepository.countAll(),
                repository.countAll(),
                repository.countByStatus(ProductRepository.STATUS_PUBLISHED),
                repository.countByStatus(ProductRepository.STATUS_HIDDEN),
                imageRepository.countAll(),
                countMissingImages(),
                sizeRepository.countAll(),
                sizeRepository.countOutOfStock(),
                sizeRepository.totalStock(),
                repository.countPublishedByCategory(),
                byGender,
                repository.countPublishedOnSale(),
                repository.countPublishedByBadge("JUST_IN"),
                repository.countPublishedByBadge("BESTSELLER"),
                sample(),
                null);
    }

    private void reloadDatabase() {
        // Xoá bảng con trước (FK); lát sau thêm bảng tham chiếu product / product_size thì xoá thêm ở đầu.
        shopOrderService.deleteAll();
        sizeRepository.deleteAll();
        imageRepository.deleteAll();
        repository.deleteAll();
        categoryRepository.deleteAll();
        insertAll();
    }

    private void insertAll() {
        categoryRepository.insertBatchReturning(data.categories());
        repository.insertBatchReturning(data.products());
        imageRepository.insertBatchReturning(data.imageRows(imageBaseUrl));
        sizeRepository.insertBatchReturning(data.sizes());
    }

    /** Dòng product_image mà object tương ứng không có trên MinIO (MinIO lỗi → tính mọi ảnh còn lại là thiếu). */
    private long countMissingImages() {
        List<String> urls = imageRepository.listAllUrls();
        String prefix = imageBaseUrl + "/";
        long missing = 0;
        for (int i = 0; i < urls.size(); i++) {
            String url = urls.get(i);
            if (!url.startsWith(prefix)) {
                missing++;
                continue;
            }
            try {
                if (!fileStorageService.existsPublic(url.substring(prefix.length()))) missing++;
            } catch (Exception e) {
                log.warn("Seed giày: không kiểm tra được ảnh trên MinIO: {}", e.getMessage());
                return missing + urls.size() - i;
            }
        }
        return missing;
    }

    private SeedSummary.Sample sample() {
        Product first = repository.getFirst();
        if (first == null) return null;
        List<String> imageUrls = imageRepository.listByProduct(first.getId()).stream()
                .map(ProductImage::getUrl)
                .toList();
        return new SeedSummary.Sample(first.getId(), first.getSlug(), imageUrls,
                sizeRepository.listByProduct(first.getId()));
    }

    private static byte[] readClasspath(String location) throws IOException {
        try (InputStream in = new ClassPathResource(location).getInputStream()) {
            return in.readAllBytes();
        }
    }
}
