package vn.aeoc.business.product.repository;

import java.math.BigDecimal;
import java.util.Set;

/**
 * Bộ lọc danh sách giày đã chuẩn hoá (plan danh-sach-giay §5.0): giá trị lạ đã bị bỏ, giá trị đã đổi sang
 * giá trị cột DB. Tập rỗng / {@code null} = không lọc nhóm đó.
 *
 * @param categoryId  id danh mục ({@code null} = mọi danh mục)
 * @param genders     giá trị cột {@code product.gender} (MEN, WOMEN, UNISEX, BOYS, GIRLS) — gender + kids gộp
 * @param priceRanges khoá khoảng giá ({@code under-1m}…, xem {@link ProductRepository#PRICE_RANGES})
 * @param sale        chỉ sản phẩm đang giảm giá
 * @param badges      giá trị cột {@code product.badge} (JUST_IN, BESTSELLER)
 * @param sizes       size EU — sản phẩm còn hàng ở ít nhất một size trong tập
 * @param keyword     từ khoá đã trim ({@code null} = không lọc)
 */
public record CatalogFilter(Integer categoryId,
                            Set<String> genders,
                            Set<String> priceRanges,
                            boolean sale,
                            Set<String> badges,
                            Set<BigDecimal> sizes,
                            String keyword) {
}
