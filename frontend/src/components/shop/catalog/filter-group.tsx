import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DEFAULT_OPEN_GROUPS, type FilterGroup, type Filters } from "@/lib/shop/catalog-search";
import type { ProductFacetsDTO } from "@/lib/types/product";
import { facetCount, sizeOptions } from "./facets";
import { FilterOption } from "./filter-option";
import { SizeGrid } from "./size-grid";

/** Tên nhóm, có lựa chọn thì `<tên> (<n>)` (plan danh-sach-giay §6.3), vd "Gender (1)". */
export const groupLabel = (group: FilterGroup, filters: Filters) => {
  const n = filters[group.key].length;
  return n ? `${group.title} (${n})` : group.title;
};

/**
 * Một nhóm lọc (testid `filter-group-<key>`).
 * - `sidebar`: thu gọn được (`Collapsible`), mặc định mở Gender, Shop by Price và nhóm đang có lựa chọn; có số đếm.
 * - `drawer` (ngăn kéo mobile): luôn mở, không số đếm, không làm mờ (§6.6, §11 câu 7).
 */
export function FilterGroupSection({
  group,
  filters,
  facets,
  variant,
  idPrefix,
  onToggle
}: {
  group: FilterGroup;
  filters: Filters;
  /** undefined: đang tải / lỗi / ngăn kéo → không có số đếm */
  facets?: ProductFacetsDTO;
  /** `facets` dùng để lấy danh sách size khi `variant = "drawer"` (không dùng số đếm) */
  variant: "sidebar" | "drawer";
  idPrefix: string;
  onToggle: (value: string) => void;
}) {
  const selected = filters[group.key];
  const counts = variant === "sidebar" ? facets : undefined;

  const body =
    group.key === "size" ? (
      <SizeGrid
        options={sizeOptions(facets, selected)}
        selected={selected}
        countOf={counts && ((v) => facetCount(counts, "size", v))}
        onToggle={onToggle}
      />
    ) : (
      <div className="flex flex-col gap-3">
        {group.options.map((o) => (
          <FilterOption
            key={o.value}
            id={`${idPrefix}-${group.key}-${o.value}`}
            testId={`filter-${group.key}-${o.value}`}
            label={o.label}
            checked={selected.includes(o.value)}
            count={facetCount(counts, group.key, o.value)}
            onToggle={() => onToggle(o.value)}
          />
        ))}
      </div>
    );

  if (variant === "drawer") {
    return (
      <section
        id={`${idPrefix}-group-${group.key}`}
        data-testid={`filter-group-${group.key}`}
        aria-labelledby={`${idPrefix}-group-${group.key}-title`}
        className="scroll-mt-4 border-b border-(--sh-border) py-6"
      >
        <h3 id={`${idPrefix}-group-${group.key}-title`} className="mb-4 text-base font-medium">
          {groupLabel(group, filters)}
        </h3>
        {body}
      </section>
    );
  }

  return <SidebarGroup group={group} filters={filters} body={body} />;
}

function SidebarGroup({
  group,
  filters,
  body
}: {
  group: FilterGroup;
  filters: Filters;
  body: React.ReactNode;
}) {
  const active = filters[group.key].length > 0;
  const [open, setOpen] = useState(() => DEFAULT_OPEN_GROUPS.includes(group.key) || active);
  // Nhóm vừa có lựa chọn (Back / Forward, link từ menu) → tự mở (§3 A6); điều chỉnh state ngay khi render
  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) {
    setWasActive(active);
    if (active) setOpen(true);
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      data-testid={`filter-group-${group.key}`}
      className="border-t border-(--sh-border)"
    >
      <CollapsibleTrigger className="group flex w-full items-center justify-between py-4 text-left text-base font-medium outline-none focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50">
        {groupLabel(group, filters)}
        <ChevronDown
          aria-hidden
          className="size-5 transition-transform duration-200 group-data-[state=open]:rotate-180 motion-reduce:transition-none"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pb-6">{body}</CollapsibleContent>
    </Collapsible>
  );
}
