import { Link } from "@tanstack/react-router";
import type { ShopOrderItemDTO } from "@/lib/types/shop-order";
import { formatVnd } from "@/lib/utils/money";

/**
 * Danh sách dòng của một đơn (plan dat-hang §6.8 mục 5) — thông tin chụp lại lúc đặt. Ảnh và tên là link về trang
 * chi tiết. Lát `don-cua-toi` dùng lại.
 */
export function OrderItems({ items }: { items: ShopOrderItemDTO[] }) {
  return (
    <ul aria-label="Order items" className="flex flex-col gap-6">
      {items.map((item) => (
        <li key={item.id} data-testid="order-item" data-size-id={item.sizeId} className="flex gap-4">
          <Link
            to="/t/$slug"
            params={{ slug: item.productSlug }}
            className="size-20 shrink-0 overflow-hidden bg-[#F5F5F5]"
          >
            {item.imageUrl && (
              <img src={item.imageUrl} alt={item.productName} loading="lazy" className="size-full object-cover" />
            )}
          </Link>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
            <Link
              to="/t/$slug"
              params={{ slug: item.productSlug }}
              data-testid="order-item-name"
              className="font-medium hover:underline"
            >
              {item.productName}
            </Link>
            {item.productSubtitle && <p className="text-(--sh-muted)">{item.productSubtitle}</p>}
            <p data-testid="order-item-size" className="text-(--sh-muted)">
              Size {item.sizeLabel}
            </p>
            <p data-testid="order-item-qty" className="text-(--sh-muted)">
              Qty {item.quantity}
            </p>
            <p data-testid="order-item-price">{formatVnd(item.lineTotal)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
