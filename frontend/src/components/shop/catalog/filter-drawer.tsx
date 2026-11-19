import { X } from "lucide-react";
import { useRef, useState } from "react";
import { ShopButton } from "@/components/shop/ui/shop-button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  activeFilterCount,
  EMPTY_FILTERS,
  FILTER_GROUPS,
  SORT_OPTIONS,
  toggleFilter,
  type CatalogSort,
  type FilterKey,
  type Filters
} from "@/lib/shop/catalog-search";
import type { ProductFacetsDTO } from "@/lib/types/product";
import { FilterGroupSection } from "./filter-group";

interface Draft {
  filters: Filters;
  sort: CatalogSort;
}

/**
 * Ngăn kéo lọc mobile (plan danh-sach-giay §6.6): `Sheet` dưới lên toàn màn hình, dialog "Filter".
 * Sửa **bản nháp** (khởi tạo từ URL mỗi lần mở); "Apply" ghi bản nháp,
 * ✕ / Esc / vuốt đóng thì bỏ. Không số đếm, không làm mờ (§11 câu 7). `focusGroup`: mở bằng pill → cuộn tới nhóm.
 */
export function FilterDrawer({
  open,
  onOpenChange,
  focusGroup,
  filters,
  sort,
  facets,
  onApply
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  focusGroup?: FilterKey;
  filters: Filters;
  sort: CatalogSort;
  /** Chỉ dùng danh sách size (không dùng số đếm) */
  facets?: ProductFacetsDTO;
  onApply: (draft: Draft) => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        aria-describedby={undefined}
        data-testid="filter-drawer"
        onOpenAutoFocus={(e) => {
          if (!focusGroup) return;
          // Mở bằng pill → cuộn tới nhóm của pill thay vì tự focus phần tử đầu
          e.preventDefault();
          const group = bodyRef.current?.querySelector<HTMLElement>(`#drawer-group-${focusGroup}`);
          group?.scrollIntoView({ block: "start" });
          group?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
        }}
        className="shop h-dvh max-h-dvh gap-0 border-none bg-(--sh-bg) p-0 text-(--sh-fg)"
      >
        {/* Radix chỉ mount nội dung khi mở → bản nháp khởi tạo lại từ URL mỗi lần mở */}
        <DrawerBody
          bodyRef={bodyRef}
          initial={{ filters, sort }}
          facets={facets}
          onApply={(d) => {
            onApply(d);
            onOpenChange(false);
          }}
        />
      </SheetContent>
    </Sheet>
  );
}

function DrawerBody({
  bodyRef,
  initial,
  facets,
  onApply
}: {
  bodyRef: React.RefObject<HTMLDivElement | null>;
  initial: Draft;
  facets?: ProductFacetsDTO;
  onApply: (draft: Draft) => void;
}) {
  const [draft, setDraft] = useState<Draft>(initial);
  const n = activeFilterCount(draft.filters);

  return (
    <>
      <div className="flex items-center justify-between px-6 pt-4 pb-2">
        <SheetTitle className="text-xl font-medium">Filter</SheetTitle>
        <SheetClose
          aria-label="Close"
          className="flex size-10 items-center justify-center rounded-full bg-(--sh-surface) outline-none hover:bg-(--sh-surface-hover) focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50"
        >
          <X aria-hidden className="size-5" />
        </SheetClose>
      </div>

      <div ref={bodyRef} className="flex-1 overflow-y-auto px-6">
        <section aria-labelledby="drawer-sort-title" className="border-b border-(--sh-border) py-6">
          <h3 id="drawer-sort-title" className="mb-4 text-base font-medium">
            Sort By
          </h3>
          <RadioGroup
            value={draft.sort}
            onValueChange={(v) => setDraft((d) => ({ ...d, sort: v as CatalogSort }))}
            aria-labelledby="drawer-sort-title"
            className="gap-3"
          >
            {SORT_OPTIONS.map((o) => (
              <div key={o.value} className="flex items-center gap-3">
                <RadioGroupItem
                  id={`drawer-sort-${o.value}`}
                  value={o.value}
                  className="size-5 border-(--sh-input-border) shadow-none data-[state=checked]:border-(--sh-primary) [&_svg]:size-2.5 [&_svg]:fill-(--sh-primary) [&_svg]:text-(--sh-primary)"
                />
                <label htmlFor={`drawer-sort-${o.value}`} className="cursor-pointer text-base">
                  {o.label}
                </label>
              </div>
            ))}
          </RadioGroup>
        </section>

        {FILTER_GROUPS.map((g) => (
          <FilterGroupSection
            key={g.key}
            group={g}
            filters={draft.filters}
            facets={facets}
            variant="drawer"
            idPrefix="drawer"
            onToggle={(v) =>
              setDraft((d) => ({ ...d, filters: toggleFilter(d.filters, g.key, v) }))
            }
          />
        ))}
      </div>

      <div className="flex gap-3 border-t border-(--sh-border) bg-(--sh-bg) px-6 pt-4 pb-6">
        <ShopButton
          variant="outline"
          className="flex-1"
          onClick={() => setDraft({ filters: EMPTY_FILTERS, sort: "featured" })}
        >
          {n ? `Clear (${n})` : "Clear"}
        </ShopButton>
        <ShopButton variant="primary" className="flex-1" onClick={() => onApply(draft)}>
          Apply
        </ShopButton>
      </div>
    </>
  );
}
