package vn.aeoc.business.product.seed;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import vn.aeoc.entity.data.mysql.product.Product;
import vn.aeoc.entity.data.mysql.product.ProductCategory;
import vn.aeoc.entity.data.mysql.product.ProductImage;
import vn.aeoc.entity.data.mysql.product.ProductSize;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** TC-U1 → TC-U6 (plan du-lieu-giay §9): kiểm products.json và ảnh trong resources, không cần DB / MinIO. */
class ShoeSeedDataTest {
    private static ShoeSeedData data;
    private static Map<Integer, String> categorySlugById;
    private static List<Product> published;

    @BeforeAll
    static void load() {
        data = ShoeSeedData.load();
        categorySlugById = data.categories().stream()
                .collect(Collectors.toMap(ProductCategory::getId, ProductCategory::getSlug));
        published = data.products().stream().filter(p -> "PUBLISHED".equals(p.getStatus())).toList();
    }

    @Test
    void tcU1_cauTrucHopLe() {
        assertEquals(5, data.categories().size());
        assertEquals(31, data.products().size());
        assertEquals(Set.of(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24,
                        25, 26, 27, 28, 29, 30, 31),
                data.products().stream().map(Product::getId).collect(Collectors.toSet()));
        assertUnique(Product::getSlug);
        assertUnique(Product::getStyleCode);
        for (Product p : data.products()) {
            assertAll("sản phẩm " + p.getId(),
                    () -> assertFalse(p.getSlug().isBlank()),
                    () -> assertTrue(p.getSlug().matches("[a-z0-9]+(-[a-z0-9]+)*"), p.getSlug()),
                    () -> assertFalse(p.getName().isBlank()),
                    () -> assertFalse(p.getSubtitle().isBlank()),
                    () -> assertFalse(p.getDescription().isBlank()),
                    () -> assertNotNull(p.getCreatedTime()),
                    () -> assertTrue(ShoeSeedData.GENDERS.contains(p.getGender())),
                    () -> assertTrue(p.getBadge() == null || ShoeSeedData.BADGES.contains(p.getBadge())),
                    () -> assertTrue(ShoeSeedData.STATUSES.contains(p.getStatus())),
                    () -> assertTrue(categorySlugById.containsKey(p.getCategoryId())),
                    () -> assertTrue(p.getSalePrice() == null || p.getSalePrice() < p.getPrice()));
        }
    }

    @Test
    void tcU1_tuChoiJsonSai() {
        String duplicateSlug = """
                {"categories":[{"id":1,"slug":"lifestyle","name":"Lifestyle","sortOrder":1}],
                 "products":[%s,%s]}""".formatted(productJson(1, "a", "X-1", "{}"), productJson(2, "a", "X-2", "{}"));
        IllegalStateException e = assertThrows(IllegalStateException.class, () -> parse(duplicateSlug));
        assertTrue(e.getMessage().contains("trùng slug a"), e.getMessage());
    }

    @Test
    void tcU2_phanBoDanhMucGioiTinhNhanGiamGia() {
        assertEquals(30, published.size());
        assertEquals(Map.of("lifestyle", 12L, "chay-bo", 6L, "bong-ro", 5L, "jordan", 5L, "bong-da", 2L),
                published.stream().collect(Collectors.groupingBy(p -> categorySlugById.get(p.getCategoryId()),
                        Collectors.counting())));
        assertEquals(Map.of("MEN", 12L, "WOMEN", 10L, "UNISEX", 4L, "BOYS", 2L, "GIRLS", 2L),
                published.stream().collect(Collectors.groupingBy(Product::getGender, Collectors.counting())));
        assertEquals(6, count(p -> p.getSalePrice() != null));
        assertEquals(8, count(p -> "JUST_IN".equals(p.getBadge())));
        assertEquals(5, count(p -> "BESTSELLER".equals(p.getBadge())));

        Set<Integer> newest = published.stream()
                .sorted(Comparator.comparing(Product::getCreatedTime).reversed())
                .limit(8).map(Product::getId).collect(Collectors.toSet());
        Set<Integer> justIn = published.stream().filter(p -> "JUST_IN".equals(p.getBadge()))
                .map(Product::getId).collect(Collectors.toSet());
        assertEquals(newest, justIn, "8 JUST_IN phải là 8 sản phẩm mới nhất");
        assertEquals(published.size(), published.stream().map(Product::getCreatedTime).distinct().count(),
                "createdTime không trùng để sắp xếp 'Mới nhất' ổn định");

        Product hidden = data.products().stream().filter(p -> p.getId() == 31).findFirst().orElseThrow();
        assertEquals("HIDDEN", hidden.getStatus());
        assertEquals("lifestyle", categorySlugById.get(hidden.getCategoryId()));
        assertEquals("MEN", hidden.getGender());
        assertNull(hidden.getBadge());
    }

    @Test
    void tcU3_khoangGiaVaGiaBien() {
        assertTrue(count(p -> selling(p) < 1_000_000) >= 4, "< 1.000.000");
        assertTrue(count(p -> selling(p) >= 1_000_000 && selling(p) <= 2_000_000) >= 4, "1.000.000–2.000.000");
        assertTrue(count(p -> selling(p) >= 2_000_001 && selling(p) <= 4_999_999) >= 4, "2.000.001–4.999.999");
        assertTrue(count(p -> selling(p) >= 5_000_000) >= 4, ">= 5.000.000");
        Set<Long> prices = published.stream().map(ShoeSeedDataTest::selling).collect(Collectors.toSet());
        assertTrue(prices.containsAll(List.of(1_000_000L, 2_000_000L, 5_000_000L)), "giá biên");
        for (Product p : data.products()) {
            assertEquals(0, p.getPrice() % 1000, p.getName());
            assertTrue(p.getSalePrice() == null || p.getSalePrice() % 1000 == 0, p.getName());
        }
    }

    @Test
    void tcU4_sizeVaId() {
        for (Product p : data.products()) {
            List<ProductSize> sizes = sizesOf(p.getId());
            List<BigDecimal> grid = ShoeSeedData.sizeValuesOf(p.getGender());
            assertEquals(grid, sizes.stream().map(ProductSize::getSizeValue).toList(), p.getName());
            for (int k = 0; k < sizes.size(); k++) {
                assertEquals(p.getId() * 100 + k + 1, sizes.get(k).getId());
                assertFalse(sizes.get(k).getSizeLabel().endsWith(".0"), sizes.get(k).getSizeLabel());
            }
        }
        assertEquals(13, ShoeSeedData.sizeValuesOf("MEN").size());
        assertEquals(11, ShoeSeedData.sizeValuesOf("WOMEN").size());
        assertEquals(8, ShoeSeedData.sizeValuesOf("BOYS").size());
        assertEquals("EU 42", ShoeSeedData.sizeLabel(new BigDecimal("42.0")));
        assertEquals("EU 40.5", ShoeSeedData.sizeLabel(new BigDecimal("40.5")));
        assertEquals("EU 38.5", sizesOf(1).get(0).getSizeLabel());
        assertEquals(101, sizesOf(1).get(0).getId());

        List<ProductImage> images = data.imageRows("http://minio/bucket");
        assertEquals(155, images.size());
        for (ProductImage img : images) {
            assertEquals(img.getProductId() * 10 + img.getSortOrder(), img.getId());
            String slug = data.products().stream().filter(p -> p.getId().equals(img.getProductId()))
                    .findFirst().orElseThrow().getSlug();
            assertEquals("http://minio/bucket/products/" + slug + "/" + img.getSortOrder() + ".webp", img.getUrl());
        }

        String badStock = """
                {"categories":[{"id":1,"slug":"lifestyle","name":"Lifestyle","sortOrder":1}],
                 "products":[%s]}""".formatted(productJson(1, "giay-a", "X-1", "{\"EU 48\": 0}"));
        IllegalStateException e = assertThrows(IllegalStateException.class, () -> parse(badStock));
        assertTrue(e.getMessage().contains("'Giay A'") && e.getMessage().contains("EU 48"), e.getMessage());
    }

    @Test
    void tcU5_quyTacTonKho() {
        int outOfStock = 0;
        int lowStock = 0;
        int lastPair = 0;
        for (Product p : data.products()) {
            List<Integer> stock = sizesOf(p.getId()).stream().map(ProductSize::getStock).toList();
            int total = stock.stream().mapToInt(Integer::intValue).sum();
            long zeros = stock.stream().filter(s -> s == 0).count();
            long ones = stock.stream().filter(s -> s == 1).count();
            if (total == 0) {
                outOfStock++;
            } else if (total <= 3) {
                lowStock++;
            } else if (ones == 1) {
                lastPair++;
                assertTrue(stock.stream().allMatch(s -> s == 1 || s == 20), p.getName());
            } else {
                assertTrue(zeros >= 1 && zeros <= 2, p.getName() + ": cần 1–2 size hết hàng, có " + zeros);
                assertTrue(stock.stream().allMatch(s -> s == 0 || s == 20), p.getName());
            }
        }
        assertEquals(1, outOfStock, "sản phẩm hết hàng");
        assertEquals(1, lowStock, "sản phẩm ít hàng (tổng tồn 1–3)");
        assertEquals(2, lastPair, "sản phẩm có đúng một size còn 1 đôi");
        long publishedSpecial = published.stream().filter(p -> {
            int total = sizesOf(p.getId()).stream().mapToInt(ProductSize::getStock).sum();
            return total <= 3;
        }).count();
        assertEquals(2, publishedSpecial, "sản phẩm hết hàng và ít hàng phải đang bán");
    }

    @Test
    void tcU6_anhCoTrongResources() throws IOException {
        assertEquals(155, data.images().size());
        for (ShoeSeedData.SeedImage image : data.images()) {
            try (InputStream in = getClass().getClassLoader().getResourceAsStream(image.classpathLocation())) {
                assertNotNull(in, "thiếu " + image.classpathLocation());
                byte[] bytes = in.readAllBytes();
                assertTrue(bytes.length > 1024 && bytes.length <= 300 * 1024,
                        image.classpathLocation() + ": " + bytes.length + " byte");
                assertEquals("RIFF", new String(bytes, 0, 4, StandardCharsets.US_ASCII));
                assertEquals("WEBP", new String(bytes, 8, 4, StandardCharsets.US_ASCII), image.classpathLocation());
            }
        }
    }

    private static long count(Predicate<Product> predicate) {
        return published.stream().filter(predicate).count();
    }

    private static long selling(Product p) {
        return p.getSalePrice() != null ? p.getSalePrice() : p.getPrice();
    }

    private static List<ProductSize> sizesOf(int productId) {
        return data.sizes().stream().filter(s -> s.getProductId() == productId).toList();
    }

    private static void assertUnique(Function<Product, String> key) {
        Set<String> seen = new HashSet<>();
        for (Product p : data.products()) assertTrue(seen.add(key.apply(p)), "trùng " + key.apply(p));
    }

    private static ShoeSeedData parse(String json) {
        return ShoeSeedData.parse(new ByteArrayInputStream(json.getBytes(StandardCharsets.UTF_8)));
    }

    private static String productJson(int id, String slug, String styleCode, String stock) {
        return """
                {"id":%d,"slug":"%s","styleCode":"%s","name":"Giay A","subtitle":"Giày nam","gender":"MEN",
                 "category":"lifestyle","description":"d","price":1000000,"salePrice":null,"badge":null,
                 "status":"PUBLISHED","createdTime":"2026-09-01T09:00:00","stock":%s}"""
                .formatted(id, slug, styleCode, stock);
    }
}
