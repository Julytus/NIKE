import { Link } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { LowStockNotice } from "@/components/shop/product-detail/low-stock-notice";
import { MAX_QUANTITY } from "@/lib/shop/cart-storage";
import { LOW_STOCK_MAX } from "@/lib/shop/product-detail";
import type { CartLineDTO } from "@/lib/types/cart";
import type { ProductSizeDTO } from "@/lib/types/product";
import { cn } from "@/lib/utils";
import { formatVnd } from "@/lib/utils/money";
import { CartQuantity } from "./cart-quantity";
import { CartSizeSelect } from "./cart-size-select";

/** Dòng còn mua được (tính tiền, có pill số lượng đầy đủ). */
export const isPurchasable = (line: Pick<CartLineDTO, "status">) =>
  line.status === "AVAILABLE" || line.status === "INSUFFICIENT_STOCK";

/**
 * Một dòng giỏ (plan gio-hang §6.5): ảnh + pill số lượng bên trái, tên / phụ đề / chọn size ở giữa, giá ở mép phải
 * (mobile: giá lên đầu). `quantity` lấy từ giỏ (đổi lạc quan), còn lại từ kết quả `check`.
 * `adjustedTo` = số lượng vừa bị tự giảm về tồn kho (§6.5 thông báo mục 1).
 */
export function CartLine({
  line,
  quantity,
  adjustedTo,
  desktop,
  onQuantityChange,
  onRemove,
  onSizeChange
}: {
  line: CartLineDTO;
  quantity: number;
  adjustedTo: number | undefined;
  desktop: boolean;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
  onSizeChange: (size: ProductSizeDTO) => void;
}) {
  const purchasable = isPurchasable(line);
  const unavailable = line.status === "UNAVAILABLE";
  const dimmed = !purchasable;
  const slug = line.slug ?? "";
  const name = line.name ?? "";

  const image = (
    <img
      src={line.imageUrl ?? undefined}
      alt={name}
      className={cn("size-full object-cover", dimmed && "opacity-50")}
    />
  );

  const price =
    !unavailable && line.unitPrice !== null ? (
      <p className="flex shrink-0 flex-wrap items-baseline gap-x-2 text-base font-medium lg:justify-end">
        <span data-testid="cart-item-price">{formatVnd(line.unitPrice * quantity)}</span>
        {line.salePrice !== null && line.price !== null && (
          <s data-testid="cart-item-original-price" className="font-normal text-(--sh-muted)">
            {formatVnd(line.price * quantity)}
          </s>
        )}
      </p>
    ) : null;

  let notice: React.ReactNode = null;
  if (adjustedTo !== undefined) {
    notice = (
      <p data-testid="cart-item-notice" className="flex items-center gap-2 text-sm text-(--sh-warning)">
        <Info aria-hidden className="size-4 shrink-0" />
        Only {adjustedTo} left in this size. We&apos;ve updated your quantity.
      </p>
    );
  } else if (line.status === "OUT_OF_STOCK") {
    notice = (
      <p data-testid="cart-item-notice" className="text-sm text-(--sh-danger)">
        This size is sold out. Choose another size or remove it.
      </p>
    );
  } else if (unavailable) {
    notice = (
      <p data-testid="cart-item-notice" className="text-sm text-(--sh-danger)">
        This product is no longer available.
      </p>
    );
  } else if (line.status === "AVAILABLE" && line.stock >= 1 && line.stock <= LOW_STOCK_MAX) {
    notice = <LowStockNotice testId="cart-item-low-stock" className="text-sm [&_svg]:size-4" />;
  }

  return (
    <li data-testid="cart-item" data-size-id={line.sizeId} className="flex flex-col gap-4 py-6">
      <div className="flex gap-4 lg:gap-6">
        <div className="flex shrink-0 flex-col gap-4">
          <div className="size-[120px] overflow-hidden bg-(--sh-surface) lg:size-[160px]">
            {unavailable ? (
              image
            ) : (
              <Link to="/t/$slug" params={{ slug }} className="block size-full">
                {image}
              </Link>
            )}
          </div>
          <CartQuantity
            quantity={quantity}
            max={Math.min(MAX_QUANTITY, line.stock)}
            purchasable={purchasable}
            onChange={onQuantityChange}
            onRemove={onRemove}
          />
        </div>

        <div className="flex min-w-0 flex-1 gap-4">
          <div className={cn("flex min-w-0 flex-1 flex-col gap-1 text-base", dimmed && "opacity-50")}>
            {!desktop && price}
            {unavailable ? (
              <p data-testid="cart-item-name" className="font-medium">
                {name}
              </p>
            ) : (
              <Link
                to="/t/$slug"
                params={{ slug }}
                data-testid="cart-item-name"
                className="w-fit font-medium hover:underline"
              >
                {name}
              </Link>
            )}
            <p data-testid="cart-item-subtitle" className="text-(--sh-muted)">
              {line.subtitle}
            </p>
            {unavailable ? (
              <p data-testid="cart-item-size" className="text-(--sh-muted)">
                Size {line.sizeLabel}
              </p>
            ) : (
              <CartSizeSelect
                slug={slug}
                sizeId={line.sizeId}
                sizeLabel={line.sizeLabel ?? ""}
                onSelect={onSizeChange}
              />
            )}
          </div>
          {desktop && <div className={cn(dimmed && "opacity-50")}>{price}</div>}
        </div>
      </div>
      {notice}
    </li>
  );
}
