package vn.aeoc.business.product.repository;

import java.util.Locale;

/** Kiểu sắp xếp danh sách giày (plan danh-sach-giay §5.1); giá trị URL ở {@link #value()}. */
public enum CatalogSort {
    FEATURED("featured"),
    NEWEST("newest"),
    PRICE_DESC("price-desc"),
    PRICE_ASC("price-asc");

    private final String value;

    CatalogSort(String value) {
        this.value = value;
    }

    public String value() {
        return value;
    }

    /** Giá trị URL (không phân biệt hoa thường, có trim) → kiểu sắp xếp; {@code null} / lạ → {@link #FEATURED}. */
    public static CatalogSort from(String raw) {
        if (raw == null) {
            return FEATURED;
        }
        String key = raw.trim().toLowerCase(Locale.ROOT);
        for (CatalogSort sort : values()) {
            if (sort.value.equals(key)) {
                return sort;
            }
        }
        return FEATURED;
    }
}
