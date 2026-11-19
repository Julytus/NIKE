import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Link } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { ShopButton } from "@/components/shop/ui/shop-button";
import { DialogClose, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { useIsDesktop } from "@/hooks/use-media-query";
import { useGoToCheckout } from "@/lib/shop/checkout";
import { cartCount } from "@/lib/shop/cart-storage";
import { useCart } from "@/lib/stores/cart";
import { cn } from "@/lib/utils";
import { formatVnd } from "@/lib/utils/money";

/** Popup tự đóng sau khoảng này kể từ lúc mở (con trỏ đang ở trên popup thì tạm dừng) — plan gio-hang §6.3. */
const AUTO_CLOSE_MS = 5_000;

/** Đôi giày vừa thêm, hiện trong popup. */
export interface AddedToBagItem {
  name: string;
  subtitle: string;
  sizeLabel: string;
  /** Giá bán một đôi (`salePrice ?? price`). */
  unitPrice: number;
  imageUrl: string | null;
}

/**
 * Popup "Added to Bag" (plan gio-hang §6.3): desktop góc phải ngay dưới header, rộng 420px; mobile trên cùng,
 * rộng hết màn hình, trượt từ trên xuống. Đóng bằng ✕, Esc, bấm nền, bấm nút, hoặc tự đóng sau 5 giây.
 * Radix đặt focus vào nút "Close" khi mở và trả focus về "Add to Bag" khi đóng.
 */
export function AddedToBagDialog({
  open,
  item,
  onClose
}: {
  open: boolean;
  item: AddedToBagItem | null;
  onClose: () => void;
}) {
  const desktop = useIsDesktop();
  return (
    <DialogPrimitive.Root open={open && item !== null} onOpenChange={(o) => {
        if (!o) onClose();
      }}>
      <DialogPortal>
        <DialogOverlay className="bg-[rgba(17,17,17,0.4)]" />
        <DialogPrimitive.Content
          data-testid="added-to-bag"
          aria-describedby={undefined}
          className={cn(
            "shop fixed z-50 bg-(--sh-bg) text-(--sh-fg) shadow-lg outline-none duration-200",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            desktop
              ? "top-[calc(var(--sh-header-offset)+8px)] right-12 w-[420px] rounded-[24px]"
              : "inset-x-0 top-0 w-full rounded-b-[24px] data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top"
          )}
        >
          {item && <AddedToBagBody item={item} onClose={onClose} />}
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}

/**
 * Nội dung popup — chỉ mount khi popup mở, nên trạng thái "đang rê chuột" và hẹn giờ luôn bắt đầu lại từ đầu.
 * Di chuột trên popup thì dừng đếm; rời chuột khỏi popup thì đếm lại đủ 5 giây.
 */
function AddedToBagBody({ item, onClose }: { item: AddedToBagItem; onClose: () => void }) {
  const [hovering, setHovering] = useState(false);
  const count = useCart((s) => cartCount(s.items));
  const checkout = useGoToCheckout();

  useEffect(() => {
    if (hovering) return;
    const timer = window.setTimeout(onClose, AUTO_CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [hovering, onClose]);

  return (
    <div
      className="flex flex-col gap-6 p-6"
      // Dùng pointermove (không dùng pointerenter): popup hiện ra ngay dưới con trỏ đứng yên (vd nút "Add to Bag"
      // bị cuộn lên vùng popup) thì Firefox vẫn bắn pointerenter — khách chưa rê chuột nên vẫn phải tự đóng
      onPointerMove={() => setHovering(true)}
      onPointerLeave={() => setHovering(false)}
    >
      <div className="flex items-center justify-between gap-4">
        <DialogTitle className="flex items-center gap-2 text-base leading-6 font-medium">
          <span aria-hidden className="flex size-5 items-center justify-center rounded-full bg-(--sh-success)">
            <Check aria-hidden className="size-3.5 text-white" strokeWidth={3} />
          </span>
          Added to Bag
        </DialogTitle>
        <DialogClose
          aria-label="Close"
          className="flex size-9 items-center justify-center rounded-full bg-(--sh-surface) transition-colors outline-none hover:bg-(--sh-surface-hover) focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50 [&_svg]:size-5"
        >
          <X aria-hidden />
        </DialogClose>
      </div>

      <div className="flex gap-4">
        <div className="size-[90px] shrink-0 overflow-hidden rounded-[8px] bg-(--sh-surface)">
          {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="size-full object-cover" />}
        </div>
        <div className="flex min-w-0 flex-col text-base">
          <p data-testid="added-to-bag-name" className="font-medium">
            {item.name}
          </p>
          <p data-testid="added-to-bag-subtitle" className="text-(--sh-muted)">
            {item.subtitle}
          </p>
          <p data-testid="added-to-bag-size" className="text-(--sh-muted)">
            Size {item.sizeLabel}
          </p>
          <p data-testid="added-to-bag-price" className="mt-2 font-medium">
            {formatVnd(item.unitPrice)}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <ShopButton asChild variant="outline" className="h-[60px] w-full rounded-[30px]">
          <Link to="/cart" onClick={onClose}>
            View Bag ({count})
          </Link>
        </ShopButton>
        <ShopButton
          variant="primary"
          disabled={checkout.disabled}
          className="h-[60px] w-full rounded-[30px]"
          onClick={() => {
            onClose();
            checkout.go();
          }}
        >
          Checkout
        </ShopButton>
      </div>
    </div>
  );
}
