package vn.aeoc.business.product.seed;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import vn.aeoc.entity.data.mysql.product.Product;
import vn.aeoc.entity.data.mysql.product.ProductCategory;
import vn.aeoc.entity.data.mysql.product.ProductImage;
import vn.aeoc.entity.data.mysql.product.ProductSize;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

/**
 * Dữ liệu mẫu cửa hàng giày đọc từ {@code classpath:seed/giay/products.json} (plan du-lieu-giay §4.1).
 * Hàm thuần: chỉ đọc JSON và dựng bản ghi cho 4 bảng, không đụng DB / MinIO.
 * <ul>
 *   <li>Size suy ra từ giới tính, tồn mặc định 20, khoá {@code stock} trong JSON chỉ ghi ngoại lệ.</li>
 *   <li>id ảnh = productId * 10 + thứ tự (1..5); id size = productId * 100 + thứ tự size (1..n).</li>
 * </ul>
 * JSON sai cấu trúc → {@link IllegalStateException} có nội dung rõ ràng (app không khởi động).
 */
public final class ShoeSeedData {
    public static final String CLASSPATH_DIR = "seed/giay/";
    public static final String CLASSPATH_JSON = CLASSPATH_DIR + "products.json";
    public static final String OBJECT_KEY_PREFIX = "products/";
    public static final int IMAGES_PER_PRODUCT = 5;
    public static final int DEFAULT_STOCK = 20;

    public static final List<String> GENDERS = List.of("MEN", "WOMEN", "UNISEX", "BOYS", "GIRLS");
    public static final Set<String> BADGES = Set.of("JUST_IN", "BESTSELLER");
    public static final Set<String> STATUSES = Set.of("DRAFT", "PUBLISHED", "HIDDEN");

    private static final List<BigDecimal> ADULT_SIZES = sizes(
            "38.5", "39", "40", "40.5", "41", "42", "42.5", "43", "44", "44.5", "45", "46", "47");
    private static final List<BigDecimal> WOMEN_SIZES = sizes(
            "35.5", "36", "36.5", "37.5", "38", "38.5", "39", "40", "40.5", "41", "42");
    private static final List<BigDecimal> KIDS_SIZES = sizes(
            "35.5", "36", "36.5", "37.5", "38", "38.5", "39", "40");

    private static final ObjectMapper MAPPER = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    record CategoryJson(Integer id, String slug, String name, Integer sortOrder) {
    }

    record ProductJson(Integer id, String slug, String styleCode, String name, String subtitle, String gender,
                       String category, String description, Long price, Long salePrice, String badge,
                       String status, String createdTime, Map<String, Integer> stock) {
    }

    record SeedFile(List<CategoryJson> categories, List<ProductJson> products) {
    }

    /** Một ảnh mẫu: file trong classpath ↔ object trên MinIO ↔ dòng {@code product_image}. */
    public record SeedImage(int productId, int sortOrder, String slug) {
        public int id() {
            return productId * 10 + sortOrder;
        }

        public String objectKey() {
            return OBJECT_KEY_PREFIX + slug + "/" + sortOrder + ".webp";
        }

        public String classpathLocation() {
            return CLASSPATH_DIR + slug + "/" + sortOrder + ".webp";
        }
    }

    private final List<ProductCategory> categories;
    private final List<Product> products;
    private final List<SeedImage> images;
    private final List<ProductSize> sizes;

    private ShoeSeedData(List<ProductCategory> categories, List<Product> products,
                         List<SeedImage> images, List<ProductSize> sizes) {
        this.categories = List.copyOf(categories);
        this.products = List.copyOf(products);
        this.images = List.copyOf(images);
        this.sizes = List.copyOf(sizes);
    }

    /** Đọc {@code classpath:seed/giay/products.json}. */
    public static ShoeSeedData load() {
        try (InputStream in = ShoeSeedData.class.getClassLoader().getResourceAsStream(CLASSPATH_JSON)) {
            if (in == null) throw new IllegalStateException("Không tìm thấy classpath:" + CLASSPATH_JSON);
            return parse(in);
        } catch (IOException e) {
            throw new IllegalStateException("Không đọc được " + CLASSPATH_JSON + ": " + e.getMessage(), e);
        }
    }

    /** Đọc và kiểm cấu trúc một file JSON cùng định dạng (dùng cho unit test). */
    public static ShoeSeedData parse(InputStream in) {
        SeedFile file;
        try {
            file = MAPPER.readValue(in, SeedFile.class);
        } catch (IOException e) {
            throw invalid("JSON không hợp lệ: " + e.getMessage());
        }
        if (file.categories() == null || file.categories().isEmpty()) throw invalid("thiếu categories");
        if (file.products() == null || file.products().isEmpty()) throw invalid("thiếu products");

        List<ProductCategory> categories = new ArrayList<>();
        Map<String, Integer> categoryIds = new HashMap<>();
        Set<Integer> categoryIdSet = new HashSet<>();
        for (CategoryJson c : file.categories()) {
            if (c.id() == null || c.id() <= 0 || blank(c.slug()) || blank(c.name())) {
                throw invalid("danh mục thiếu id / slug / name: " + c);
            }
            if (!categoryIdSet.add(c.id()) || categoryIds.put(c.slug(), c.id()) != null) {
                throw invalid("danh mục trùng id hoặc slug: " + c.slug());
            }
            ProductCategory category = new ProductCategory();
            category.setId(c.id());
            category.setSlug(c.slug());
            category.setName(c.name());
            category.setSortOrder(c.sortOrder() == null ? 0 : c.sortOrder());
            categories.add(category);
        }

        List<Product> products = new ArrayList<>();
        List<SeedImage> images = new ArrayList<>();
        List<ProductSize> sizes = new ArrayList<>();
        Set<Integer> ids = new HashSet<>();
        Set<String> slugs = new HashSet<>();
        Set<String> styleCodes = new HashSet<>();
        for (ProductJson p : file.products()) {
            String label = p.name() == null ? "id " + p.id() : "'" + p.name() + "'";
            if (p.id() == null || p.id() <= 0) throw invalid("sản phẩm " + label + " thiếu id");
            if (Stream.of(p.slug(), p.styleCode(), p.name(), p.subtitle(), p.description(), p.createdTime())
                    .anyMatch(ShoeSeedData::blank)) {
                throw invalid("sản phẩm " + label + " thiếu slug / styleCode / name / subtitle / description / createdTime");
            }
            if (!ids.add(p.id())) throw invalid("trùng id sản phẩm " + p.id());
            if (!slugs.add(p.slug())) throw invalid("trùng slug " + p.slug());
            if (!styleCodes.add(p.styleCode())) throw invalid("trùng styleCode " + p.styleCode());
            if (!GENDERS.contains(p.gender())) throw invalid("sản phẩm " + label + " có gender sai: " + p.gender());
            if (p.badge() != null && !BADGES.contains(p.badge())) {
                throw invalid("sản phẩm " + label + " có badge sai: " + p.badge());
            }
            if (!STATUSES.contains(p.status())) throw invalid("sản phẩm " + label + " có status sai: " + p.status());
            Integer categoryId = categoryIds.get(p.category());
            if (categoryId == null) throw invalid("sản phẩm " + label + " có danh mục không tồn tại: " + p.category());
            if (p.price() == null || p.price() <= 0) throw invalid("sản phẩm " + label + " thiếu giá");
            if (p.salePrice() != null && (p.salePrice() <= 0 || p.salePrice() >= p.price())) {
                throw invalid("sản phẩm " + label + " có salePrice phải nhỏ hơn price");
            }
            LocalDateTime createdTime;
            try {
                createdTime = LocalDateTime.parse(p.createdTime());
            } catch (DateTimeParseException e) {
                throw invalid("sản phẩm " + label + " có createdTime sai: " + p.createdTime());
            }

            Product product = new Product();
            product.setId(p.id());
            product.setSlug(p.slug());
            product.setStyleCode(p.styleCode());
            product.setName(p.name());
            product.setSubtitle(p.subtitle());
            product.setGender(p.gender());
            product.setCategoryId(categoryId);
            product.setDescription(p.description());
            product.setPrice(p.price());
            product.setSalePrice(p.salePrice());
            product.setBadge(p.badge());
            product.setStatus(p.status());
            product.setCreatedTime(createdTime);
            product.setUpdatedTime(createdTime);
            products.add(product);

            for (int n = 1; n <= IMAGES_PER_PRODUCT; n++) {
                images.add(new SeedImage(p.id(), n, p.slug()));
            }
            sizes.addAll(sizesOf(p, label));
        }
        return new ShoeSeedData(categories, products, images, sizes);
    }

    /** Lưới size của giới tính, tăng dần (plan §4.1). */
    public static List<BigDecimal> sizeValuesOf(String gender) {
        return switch (gender) {
            case "MEN", "UNISEX" -> ADULT_SIZES;
            case "WOMEN" -> WOMEN_SIZES;
            case "BOYS", "GIRLS" -> KIDS_SIZES;
            default -> throw invalid("gender sai: " + gender);
        };
    }

    /** "EU 40.5", "EU 42" (không ghi ".0"). */
    public static String sizeLabel(BigDecimal value) {
        return "EU " + value.stripTrailingZeros().toPlainString();
    }

    private static List<ProductSize> sizesOf(ProductJson p, String label) {
        List<BigDecimal> values = sizeValuesOf(p.gender());
        Map<String, Integer> stock = p.stock() == null ? Map.of() : p.stock();
        Set<String> labels = new LinkedHashSet<>();
        List<ProductSize> result = new ArrayList<>();
        for (int k = 0; k < values.size(); k++) {
            String sizeLabel = sizeLabel(values.get(k));
            labels.add(sizeLabel);
            ProductSize size = new ProductSize();
            size.setId(p.id() * 100 + k + 1);
            size.setProductId(p.id());
            size.setSizeLabel(sizeLabel);
            size.setSizeValue(values.get(k));
            size.setStock(stock.getOrDefault(sizeLabel, DEFAULT_STOCK));
            if (size.getStock() == null || size.getStock() < 0) {
                throw invalid("sản phẩm " + label + " có tồn kho âm ở size " + sizeLabel);
            }
            result.add(size);
        }
        for (String key : stock.keySet()) {
            if (!labels.contains(key)) {
                throw invalid("sản phẩm " + label + " có size không thuộc lưới " + p.gender() + ": " + key);
            }
        }
        return result;
    }

    /** Dòng {@code product_image} với URL đầy đủ {@code <imageBaseUrl>/products/<slug>/<n>.webp}. */
    public List<ProductImage> imageRows(String imageBaseUrl) {
        return images.stream().map(img -> {
            ProductImage row = new ProductImage();
            row.setId(img.id());
            row.setProductId(img.productId());
            row.setSortOrder(img.sortOrder());
            row.setUrl(imageBaseUrl + "/" + img.objectKey());
            return row;
        }).toList();
    }

    public List<ProductCategory> categories() {
        return categories;
    }

    public List<Product> products() {
        return products;
    }

    public List<SeedImage> images() {
        return images;
    }

    public List<ProductSize> sizes() {
        return sizes;
    }

    private static List<BigDecimal> sizes(String... values) {
        return Stream.of(values).map(v -> new BigDecimal(v).setScale(1)).toList();
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }

    private static IllegalStateException invalid(String detail) {
        return new IllegalStateException(CLASSPATH_JSON + ": " + detail);
    }
}
