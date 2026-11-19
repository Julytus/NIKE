import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { createProductDetailQueryOptions } from "@/lib/tanstack/options/product";
import type { ProductSizeDTO } from "@/lib/types/product";

const LOADING_VALUE = "loading";

/**
 * Chọn lại size ngay tại dòng giỏ (plan gio-hang §6.5.1): trigger chữ gạch chân "Size EU 42"; mở ra mới tải
 * chi tiết sản phẩm (dùng chung cache với trang chi tiết). Size hết hàng `disabled`, mục đang chọn có ✓.
 */
export function CartSizeSelect({
  slug,
  sizeId,
  sizeLabel,
  onSelect
}: {
  slug: string;
  sizeId: number;
  sizeLabel: string;
  onSelect: (size: ProductSizeDTO) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data } = useQuery({ ...createProductDetailQueryOptions(slug), enabled: open });
  const label = `Size ${sizeLabel}`;

  return (
    <Select
      open={open}
      onOpenChange={setOpen}
      value={String(sizeId)}
      onValueChange={(v) => {
        const size = data?.sizes.find((s) => String(s.id) === v);
        if (size) onSelect(size);
      }}
    >
      {/* Không dùng SelectValue: chữ trên trigger là "Size EU 42", mục trong danh sách chỉ là "EU 42" */}
      <SelectTrigger
        data-testid="cart-item-size"
        aria-label={label}
        className="h-auto gap-1 rounded-sm border-0 bg-transparent p-0 text-base text-(--sh-muted) underline underline-offset-4 shadow-none hover:text-(--sh-fg) focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50 data-[size=default]:h-auto"
      >
        {label}
      </SelectTrigger>
      <SelectContent position="popper" align="start" className="shop max-h-72 bg-(--sh-bg) text-(--sh-fg)">
        {data ? (
          data.sizes.map((s) => (
            <SelectItem key={s.id} value={String(s.id)} disabled={s.stock === 0} className="text-base">
              {s.sizeLabel}
            </SelectItem>
          ))
        ) : (
          <SelectItem value={LOADING_VALUE} disabled className="text-base">
            Loading sizes…
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
