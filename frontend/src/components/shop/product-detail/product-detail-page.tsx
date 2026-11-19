import { useRef, useState } from "react";
import { ShopButton } from "@/components/shop/ui/shop-button";
import { useIsDesktop } from "@/hooks/use-media-query";
import { showLowStock } from "@/lib/shop/product-detail";
import type { ProductDetailDTO } from "@/lib/types/product";
import { DeliveryReturns } from "./delivery-returns";
import { LowStockNotice } from "./low-stock-notice";
import { ProductDescription } from "./product-description";
import { ProductGallery, type ProductGalleryHandle } from "./product-gallery";
import { ProductSummary } from "./product-summary";
import { ProductThumbnails } from "./product-thumbnails";
import { RelatedProducts } from "./related-products";
import { SizeGuideDialog } from "./size-guide-dialog";
import { SizePicker } from "./size-picker";

/**
 * Trang chi tiết giày (plan chi-tiet-giay §6.1): desktop hai cột 2fr / 1fr (gallery sát mép trái, cột thông tin
 * dính dưới header), mobile một cột (tên / giá → gallery → ảnh nhỏ → size → nút → mô tả).
 * Route đặt `key={slug}` nên sang sản phẩm khác là state (size, lỗi, ảnh) về mặc định.
 */
export function ProductDetailPage({ product }: { product: ProductDetailDTO }) {
  const desktop = useIsDesktop();
  const gallery = useRef<ProductGalleryHandle>(null);
  const sizeGrid = useRef<HTMLDivElement>(null);

  const [imageIndex, setImageIndex] = useState(0);
  const [selectedSizeId, setSelectedSizeId] = useState<number | null>(null);
  const [sizeError, setSizeError] = useState(false);

  const selectedSize = product.sizes.find((s) => s.id === selectedSizeId) ?? null;
  const soldOut = product.totalStock === 0;

  const selectSize = (id: number) => {
    setSelectedSizeId(id);
    setSizeError(false);
  };

  /** Lát này chỉ kiểm tra "chưa chọn size"; thêm vào giỏ thuộc lát `gio-hang` (§11 câu 1). */
  const addToBag = () => {
    if (selectedSize) return;
    setSizeError(true);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    sizeGrid.current?.scrollIntoView({ block: "center", behavior: reduce ? "instant" : "smooth" });
  };

  const galleryEl = (
    <ProductGallery
      ref={gallery}
      name={product.name}
      images={product.images}
      current={imageIndex}
      desktop={desktop}
      onCurrentChange={setImageIndex}
    />
  );

  const purchase = (
    <div className="flex flex-col gap-6">
      <ProductThumbnails
        images={product.images}
        current={imageIndex}
        onSelect={(i) => gallery.current?.scrollToImage(i)}
      />
      {showLowStock(product, selectedSize) && <LowStockNotice />}
      <SizePicker
        gridRef={sizeGrid}
        sizes={product.sizes}
        selectedId={selectedSizeId}
        error={sizeError}
        desktop={desktop}
        aside={<SizeGuideDialog product={product} selectedId={selectedSizeId} />}
        onSelect={selectSize}
      />
      <ShopButton
        variant="primary"
        data-testid="pdp-add-to-bag"
        disabled={soldOut}
        onClick={addToBag}
        className="h-[60px] w-full rounded-[30px]"
      >
        {soldOut ? "Sold Out" : "Add to Bag"}
      </ShopButton>
      <div className="mt-4 flex flex-col gap-10">
        <ProductDescription description={product.description} styleCode={product.styleCode} />
        <DeliveryReturns />
      </div>
    </div>
  );

  return (
    <div className="pb-16">
      {desktop ? (
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-start">
          {galleryEl}
          <div className="sticky top-(--sh-header-offset) flex flex-col gap-8 px-12 pt-12 transition-[top]">
            <ProductSummary product={product} />
            {purchase}
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="px-6 pt-6 pb-4">
            <ProductSummary product={product} />
          </div>
          {galleryEl}
          <div className="px-6">{purchase}</div>
        </div>
      )}

      <div className="mt-20 px-6 lg:px-12">
        <RelatedProducts slug={product.slug} />
      </div>
    </div>
  );
}
