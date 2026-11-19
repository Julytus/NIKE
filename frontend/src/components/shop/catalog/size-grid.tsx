import { Toggle } from "@/components/ui/toggle";
import type { SizeOption } from "./facets";

/**
 * Lưới size 3 cột (plan danh-sach-giay §6.3): nút bật / tắt (`aria-pressed`) chữ "EU 40.5",
 * testid `filter-size-<value>`, cao 40px viền `#E5E5E5` bo 4px. `countOf` undefined → không mờ nút nào.
 */
export function SizeGrid({
  options,
  selected,
  countOf,
  onToggle
}: {
  options: SizeOption[];
  selected: string[];
  countOf?: (value: string) => number | undefined;
  onToggle: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((o) => {
        const pressed = selected.includes(o.value);
        return (
          <Toggle
            key={o.value}
            data-testid={`filter-size-${o.value}`}
            pressed={pressed}
            disabled={countOf?.(o.value) === 0 && !pressed}
            onPressedChange={() => onToggle(o.value)}
            className="h-10 rounded-[4px] border border-(--sh-border) bg-(--sh-bg) px-1 text-sm font-normal text-(--sh-fg) shadow-none hover:border-(--sh-fg) hover:bg-(--sh-bg) hover:text-(--sh-fg) focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50 disabled:bg-(--sh-surface) disabled:text-[#cacacb] disabled:opacity-100 data-[state=on]:border-(--sh-fg) data-[state=on]:bg-(--sh-bg) data-[state=on]:text-(--sh-fg) data-[state=on]:ring-1 data-[state=on]:ring-(--sh-fg)"
          >
            {o.label}
          </Toggle>
        );
      })}
    </div>
  );
}
