import { Minus, Plus, Trash2 } from "lucide-react";
import { ShopButton } from "@/components/shop/ui/shop-button";

/**
 * Pill số lượng của một dòng giỏ (plan gio-hang §6.5): trái là 🗑 "Remove" khi còn 1 đôi, − "Decrease quantity"
 * khi > 1; giữa là số; phải là ＋ "Increase quantity" (khoá khi đã đủ `max`). Dòng không mua được
 * (`purchasable = false`) chỉ còn nút "Remove".
 */
export function CartQuantity({
  quantity,
  max,
  purchasable,
  onChange,
  onRemove
}: {
  quantity: number;
  max: number;
  purchasable: boolean;
  onChange: (quantity: number) => void;
  onRemove: () => void;
}) {
  const remove = (
    <ShopButton variant="ghost" size="icon-sm" aria-label="Remove" data-testid="cart-item-remove" onClick={onRemove}>
      <Trash2 aria-hidden />
    </ShopButton>
  );

  return (
    <div
      data-testid="cart-item-quantity"
      className="flex h-10 w-fit items-center gap-1 rounded-full border border-(--sh-border) px-1.5"
    >
      {!purchasable ? (
        remove
      ) : (
        <>
          {quantity <= 1 ? (
            remove
          ) : (
            <ShopButton
              variant="ghost"
              size="icon-sm"
              aria-label="Decrease quantity"
              data-testid="cart-item-decrease"
              onClick={() => onChange(quantity - 1)}
            >
              <Minus aria-hidden />
            </ShopButton>
          )}
          <span data-testid="cart-item-qty" className="min-w-6 text-center text-base">
            {quantity}
          </span>
          <ShopButton
            variant="ghost"
            size="icon-sm"
            aria-label="Increase quantity"
            data-testid="cart-item-increase"
            disabled={quantity >= max}
            onClick={() => onChange(quantity + 1)}
          >
            <Plus aria-hidden />
          </ShopButton>
        </>
      )}
    </div>
  );
}
