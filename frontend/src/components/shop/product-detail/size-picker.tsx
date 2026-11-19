import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { useRef, type Ref } from "react";
import { RadioGroup } from "@/components/ui/radio-group";
import { sizeTestValue } from "@/lib/shop/product-detail";
import type { ProductSizeDTO } from "@/lib/types/product";
import { cn } from "@/lib/utils";

const ARROW_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

/**
 * "Select Size" + lưới size (plan chi-tiet-giay §6.4 mục 6 → 8): `RadioGroup` 4 cột desktop / 3 cột mobile,
 * ô hết hàng `disabled`, không chọn sẵn; phím mũi tên đi qua các ô còn hàng (Radix).
 * `error`: chữ "Select Size" đỏ, lưới bọc viền đỏ (`aria-invalid`), dưới lưới "Please select a size.".
 * `aside`: nút "Size Guide" bên phải hàng tiêu đề.
 */
export function SizePicker({
  gridRef,
  sizes,
  selectedId,
  error,
  desktop,
  aside,
  onSelect
}: {
  gridRef?: Ref<HTMLDivElement>;
  sizes: ProductSizeDTO[];
  selectedId: number | null;
  error: boolean;
  desktop: boolean;
  aside: React.ReactNode;
  onSelect: (id: number) => void;
}) {
  /**
   * Radix chỉ chọn ô khi focus tới lúc phím mũi tên còn đang giữ, nhưng focus được dời trong `setTimeout`
   * → keydown + keyup liền nhau (trình đọc màn hình, test tự động) chỉ dời focus mà không chọn.
   * Ghi nhận phím mũi tên tới hết lượt `setTimeout` đó và chọn ô nhận focus.
   */
  const arrowNav = useRef(false);
  const onGridKeyDown = (e: React.KeyboardEvent) => {
    if (!ARROW_KEYS.includes(e.key)) return;
    arrowNav.current = true;
    setTimeout(() => {
      arrowNav.current = false;
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <p
          id="pdp-size-label"
          className={cn("text-base font-medium", error && "text-(--sh-danger)")}
        >
          Select Size
        </p>
        {aside}
      </div>
      <RadioGroup
        ref={gridRef}
        data-testid="pdp-size-grid"
        aria-labelledby="pdp-size-label"
        aria-invalid={error || undefined}
        value={selectedId == null ? "" : String(selectedId)}
        onValueChange={(v) => onSelect(Number(v))}
        onKeyDown={onGridKeyDown}
        className={cn(
          "grid gap-2 rounded-[4px]",
          desktop ? "grid-cols-4" : "grid-cols-3",
          error && "ring-1 ring-(--sh-danger) ring-offset-0"
        )}
      >
        {sizes.map((s) => (
          <RadioGroupPrimitive.Item
            key={s.id}
            value={String(s.id)}
            disabled={s.stock === 0}
            data-testid={`pdp-size-${sizeTestValue(s.sizeValue)}`}
            onFocus={() => {
              if (arrowNav.current) onSelect(s.id);
            }}
            className={cn(
              "flex h-12 items-center justify-center rounded-[4px] border border-(--sh-border) bg-(--sh-bg) text-base transition-colors outline-none",
              "hover:border-(--sh-fg) focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50",
              "data-[state=checked]:border-(--sh-fg) data-[state=checked]:shadow-[inset_0_0_0_0.5px_var(--sh-fg)]",
              "disabled:cursor-not-allowed disabled:bg-(--sh-surface) disabled:text-(--sh-disabled) disabled:hover:border-(--sh-border)"
            )}
          >
            {s.sizeLabel}
          </RadioGroupPrimitive.Item>
        ))}
      </RadioGroup>
      {error && (
        <p data-testid="pdp-size-error" role="alert" className="text-base text-(--sh-danger)">
          Please select a size.
        </p>
      )}
    </div>
  );
}
