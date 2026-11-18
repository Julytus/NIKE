package vn.aeoc.business.product.seed;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import vn.aeoc.authenticate.service.FileStorageService;

/**
 * Khi khởi động (mọi profile, sau Flyway): nạp dữ liệu mẫu giày nếu DB trống, rồi đẩy ảnh còn thiếu lên MinIO
 * (plan du-lieu-giay §3 bước 2, A1, A2, E1).
 */
@Component
@RequiredArgsConstructor
public class ShoeSeedRunner implements ApplicationRunner {
    private final ShoeSeedService shoeSeedService;
    private final FileStorageService fileStorageService;

    @Override
    public void run(ApplicationArguments args) {
        shoeSeedService.seedIfEmpty();
        // Runner chạy trước ApplicationReadyEvent (nơi FileStorageService tạo bucket): tạo bucket trước khi đẩy ảnh.
        fileStorageService.ensureBucket();
        shoeSeedService.pushMissingImages();
    }
}
