package vn.aeoc.app;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;

import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * TC-U2 (plan go-lut §9): context Spring khởi động sau khi xoá các package LUT và không còn bean nào
 * thuộc package đã xoá. Dùng cấu hình local (backend/.env, MySQL + MinIO Docker phải đang chạy).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
class ApplicationContextTest {
    private static final String[] REMOVED_PACKAGES = {
            "vn.aeoc.business.lut", "vn.aeoc.business.billing", "vn.aeoc.business.download",
            "vn.aeoc.business.collection", "vn.aeoc.business.recommend", "vn.aeoc.business.dashboard"
    };

    @Autowired
    private ApplicationContext context;

    @Test
    void contextLoads_withoutBeansFromRemovedPackages() {
        for (String name : context.getBeanDefinitionNames()) {
            Object bean = context.getBean(name);
            String type = bean.getClass().getName();
            assertTrue(Arrays.stream(REMOVED_PACKAGES).noneMatch(type::startsWith),
                    "Bean " + name + " thuộc package đã xoá: " + type);
        }
        assertTrue(context.getBeanNamesForType(vn.aeoc.business.payment.payos.PayosClient.class).length == 1);
    }
}
