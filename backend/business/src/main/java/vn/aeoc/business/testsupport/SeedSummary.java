package vn.aeoc.business.testsupport;

import com.fasterxml.jackson.annotation.JsonInclude;
import vn.aeoc.entity.data.mysql.product.ProductSize;

import java.util.List;
import java.util.Map;

/**
 * Số liệu dữ liệu mẫu cửa hàng (plan du-lieu-giay §5.1). Không phải bảng nên không có POJO entity.
 * {@code categories}, {@code products}, {@code images}, {@code sizes}, {@code outOfStockSizes}, {@code totalStock}
 * đếm trên toàn bộ bảng; {@code byCategory}, {@code byGender}, {@code onSale}, {@code justIn}, {@code bestseller}
 * chỉ tính sản phẩm PUBLISHED. {@code resetAt} chỉ có ở kết quả của reset.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record SeedSummary(
        long categories,
        long products,
        long publishedProducts,
        long hiddenProducts,
        long images,
        long missingImages,
        long sizes,
        long outOfStockSizes,
        long totalStock,
        Map<String, Integer> byCategory,
        Map<String, Integer> byGender,
        long onSale,
        long justIn,
        long bestseller,
        Sample sample,
        String resetAt
) {
    /** Sản phẩm id nhỏ nhất: ảnh theo sort_order, size theo size_value tăng dần. */
    public record Sample(Integer id, String slug, List<String> imageUrls, List<ProductSize> sizes) {
    }

    public SeedSummary withResetAt(String at) {
        return new SeedSummary(categories, products, publishedProducts, hiddenProducts, images, missingImages,
                sizes, outOfStockSizes, totalStock, byCategory, byGender, onSale, justIn, bestseller, sample, at);
    }
}
