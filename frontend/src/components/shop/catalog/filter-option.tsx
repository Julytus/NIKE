import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

/**
 * Một lựa chọn lọc dạng checkbox (plan danh-sach-giay §6.3): checkbox vuông 20px + nhãn + số đếm `(n)`.
 * testid `filter-<key>-<value>` đặt trên checkbox; `count` undefined → không hiện số, không mờ.
 * Số 0 và chưa chọn → `disabled`; đã chọn luôn bấm được để bỏ chọn.
 */
export function FilterOption({
  id,
  testId,
  label,
  checked,
  count,
  onToggle
}: {
  id: string;
  testId: string;
  label: string;
  checked: boolean;
  count?: number;
  onToggle: () => void;
}) {
  const disabled = count === 0 && !checked;
  return (
    <div className="flex items-center gap-3">
      <Checkbox
        id={id}
        data-testid={testId}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onToggle}
        className="size-5 rounded-[4px] border-(--sh-input-border) bg-(--sh-bg) shadow-none focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50 data-[state=checked]:border-(--sh-primary) data-[state=checked]:bg-(--sh-primary) data-[state=checked]:text-white [&_svg]:size-4"
      />
      <label
        htmlFor={id}
        className={cn(
          "cursor-pointer text-base select-none",
          disabled && "cursor-not-allowed text-(--sh-muted) opacity-60"
        )}
      >
        {label}
        {count !== undefined && (
          <>
            {" "}
            <span data-testid="filter-count" className="text-(--sh-muted)">{`(${count})`}</span>
          </>
        )}
      </label>
    </div>
  );
}
