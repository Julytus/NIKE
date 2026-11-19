import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { SectionError } from "@/components/shop/home/section-error";
import { ShopButton } from "@/components/shop/ui/shop-button";
import { Separator } from "@/components/ui/separator";
import { apiErrorOf } from "@/lib/axios/error";
import { createShopOrderQueryOptions } from "@/lib/tanstack/options/shop-order";
import type { ShopOrderDTO } from "@/lib/types/shop-order";
import { formatVnd } from "@/lib/utils/money";
import { OrderItems } from "./order-items";
import { OrderNotFound } from "./order-not-found";
import { OrderSkeleton } from "./order-skeleton";
import { OrderTotals } from "./order-totals";

/**
 * Trang xác nhận đơn `/checkout/result/$code` (plan dat-hang §6.8). Đặt xong, `/checkout` đã nạp sẵn đơn vào cache
 * nên trang hiện ngay; mở thẳng URL thì tải `GET /shop-order/get` (404 → "Order Not Found").
 */
export function OrderResultPage({ code }: { code: string }) {
  const { data, error, isPending, isError, refetch } = useQuery(createShopOrderQueryOptions(code));

  let body: React.ReactNode;
  if (isPending) body = <OrderSkeleton />;
  else if (isError)
    body =
      apiErrorOf(error).status === 404 ? (
        <OrderNotFound />
      ) : (
        <SectionError message="Couldn't load your order." onRetry={() => void refetch()} />
      );
  else body = <OrderResult order={data} />;

  return <div className="mx-auto w-full max-w-[752px] px-4 pt-6 pb-16 lg:pt-10">{body}</div>;
}

function OrderResult({ order }: { order: ShopOrderDTO }) {
  return (
    <div data-testid="order-result" className="flex flex-col gap-8">
      <div className="flex flex-col items-start gap-4">
        <span className="flex size-12 items-center justify-center rounded-full bg-(--sh-success) text-white">
          <Check aria-hidden="true" className="size-7" strokeWidth={2.5} />
        </span>
        <h1 className="text-[28px] font-medium">Thank you for your order</h1>
        <div className="flex flex-col gap-1 text-base">
          <p>
            <span className="text-(--sh-muted)">Order number</span>{" "}
            <span data-testid="order-code" className="font-medium">
              {order.code}
            </span>
          </p>
          <p data-testid="order-pay-note">Pay {formatVnd(order.total)} in cash when your order arrives.</p>
        </div>
      </div>

      <Separator className="bg-(--sh-border)" />

      <section aria-labelledby="order-delivery-title" className="flex flex-col gap-3">
        <h2 id="order-delivery-title" className="text-xl font-medium">
          Delivery Details
        </h2>
        <div className="flex flex-col gap-1 text-base break-words">
          <p data-testid="order-receiver" className="font-medium">
            {order.receiverName}
          </p>
          <p data-testid="order-phone">{order.phone}</p>
          <p data-testid="order-address">{order.address}</p>
          {order.note && (
            <p data-testid="order-note" className="text-(--sh-muted)">
              {order.note}
            </p>
          )}
        </div>
      </section>

      <Separator className="bg-(--sh-border)" />

      <section aria-labelledby="order-items-title" className="flex flex-col gap-6">
        <h2 id="order-items-title" className="text-xl font-medium">
          Items ({order.itemCount})
        </h2>
        <OrderItems items={order.items} />
      </section>

      <Separator className="bg-(--sh-border)" />

      <OrderTotals order={order} />

      <ShopButton asChild variant="primary" className="self-start">
        <Link to="/w">Continue Shopping</Link>
      </ShopButton>
    </div>
  );
}
