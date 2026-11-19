import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { SORT_OPTIONS, type CatalogSort } from "@/lib/shop/catalog-search";

/**
 * Nút "Sort By" (plan danh-sach-giay §6.2): mặc định "Sort By", khác mặc định "Sort By: <nhãn>".
 * Menu căn phải, 4 mục `menuitemradio`; chọn → đóng menu, ghi URL.
 */
export function SortMenu({
  value,
  onChange
}: {
  value: CatalogSort;
  onChange: (sort: CatalogSort) => void;
}) {
  const current = SORT_OPTIONS.find((o) => o.value === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-testid="sort-trigger"
        className="inline-flex h-10 items-center gap-2 rounded-sm text-base outline-none hover:text-(--sh-muted) focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50"
      >
        {value === "featured" ? "Sort By" : `Sort By: ${current?.label}`}
        <ChevronDown aria-hidden className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        // Không có hiệu ứng đóng: bấm lại "Sort By" khi menu cũ còn đang mờ dần thì Radix bỏ qua cú bấm
        className="shop min-w-48 data-[state=closed]:animate-none! rounded-[12px] border-none bg-(--sh-bg) p-3 text-(--sh-fg) shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
      >
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as CatalogSort)}>
          {SORT_OPTIONS.map((o) => (
            <DropdownMenuRadioItem
              key={o.value}
              value={o.value}
              className="cursor-pointer justify-end rounded-sm py-1.5 pr-2 pl-8 text-base focus:bg-(--sh-surface) focus:text-(--sh-fg)"
            >
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
