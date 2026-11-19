import { Ruler, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { sizeGuideRows, usColumnTitle } from "@/lib/shop/size-guide";
import type { ProductDetailDTO } from "@/lib/types/product";
import { cn } from "@/lib/utils";

/**
 * Nút "Size Guide" + hộp thoại bảng quy đổi EU / UK / US / cm theo giới tính sản phẩm (plan chi-tiet-giay §6.5).
 * Chỉ có các size của sản phẩm (cùng thứ tự lưới); dòng của size đang chọn `data-selected="true"`, chữ đậm.
 */
export function SizeGuideDialog({
  product,
  selectedId
}: {
  product: Pick<ProductDetailDTO, "gender" | "sizes" | "subtitle">;
  selectedId: number | null;
}) {
  const rows = sizeGuideRows(product);
  return (
    <Dialog>
      <DialogTrigger
        data-testid="pdp-size-guide"
        className="flex items-center gap-2 rounded-sm text-base font-medium outline-none hover:text-(--sh-muted) focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50 [&_svg]:size-5"
      >
        <Ruler aria-hidden />
        Size Guide
      </DialogTrigger>
      <DialogContent
        data-testid="size-guide"
        showCloseButton={false}
        className="shop max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto rounded-[20px] border-0 bg-(--sh-bg) p-6 text-(--sh-fg) sm:max-w-[560px] lg:p-8"
      >
        <DialogHeader className="pr-10 text-left">
          <DialogTitle className="text-2xl font-medium">Size Guide</DialogTitle>
          <DialogDescription className="text-base text-(--sh-muted)">{product.subtitle}</DialogDescription>
        </DialogHeader>
        <DialogClose
          aria-label="Close"
          className="absolute top-5 right-5 flex size-9 items-center justify-center rounded-full bg-(--sh-surface) transition-colors outline-none hover:bg-(--sh-surface-hover) focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50 [&_svg]:size-5"
        >
          <X aria-hidden />
        </DialogClose>
        <p className="text-base">
          Find your size by foot length. If you&apos;re between sizes, we recommend sizing up.
        </p>
        <Table className="text-base">
          <TableHeader>
            <TableRow className="border-(--sh-border) hover:bg-transparent">
              <TableHead className="text-(--sh-fg)">EU</TableHead>
              <TableHead className="text-(--sh-fg)">UK</TableHead>
              <TableHead className="text-(--sh-fg)">{usColumnTitle(product.gender)}</TableHead>
              <TableHead className="text-(--sh-fg)">Foot Length (cm)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const selected = r.sizeId === selectedId;
              return (
                <TableRow
                  key={r.sizeId}
                  data-testid="size-guide-row"
                  data-selected={selected ? "true" : undefined}
                  className={cn(
                    "border-(--sh-border) hover:bg-transparent",
                    selected && "bg-(--sh-surface) font-semibold hover:bg-(--sh-surface)"
                  )}
                >
                  <TableCell>{r.eu}</TableCell>
                  <TableCell>{r.uk}</TableCell>
                  <TableCell>{r.us}</TableCell>
                  <TableCell>{r.cm}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
