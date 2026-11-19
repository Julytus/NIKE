import { ShopButton } from "@/components/shop/ui/shop-button";

/** Lỗi tải một khối trong trang (vd "Không tải được sản phẩm mới.") + nút "Thử lại". */
export function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-[12px] bg-(--sh-surface) p-6">
      <p className="text-base">{message}</p>
      <ShopButton variant="primary" size="sm" onClick={onRetry}>
        Thử lại
      </ShopButton>
    </div>
  );
}
