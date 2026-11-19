import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from "@/lib/shop/shipping";
import { formatVnd } from "@/lib/utils/money";

const linkClass =
  "rounded-sm font-medium underline underline-offset-4 outline-none hover:text-(--sh-muted) focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50";

/** Accordion "Free Delivery and Returns", mặc định đóng (plan chi-tiet-giay §6.4 mục 11). */
export function DeliveryReturns() {
  return (
    <Collapsible className="border-y border-(--sh-border)">
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-4 rounded-sm py-6 text-left text-xl font-medium outline-none focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50">
        Free Delivery and Returns
        <ChevronDown
          aria-hidden
          className="size-6 shrink-0 transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
        />
      </CollapsibleTrigger>
      <CollapsibleContent data-testid="pdp-delivery" className="flex flex-col gap-4 pb-8 text-base leading-[1.75]">
        <p>
          Free standard delivery on orders of {formatVnd(FREE_SHIPPING_THRESHOLD)} or more. Orders under{" "}
          {formatVnd(FREE_SHIPPING_THRESHOLD)} have a {formatVnd(SHIPPING_FEE)} delivery fee.
        </p>
        <p>Not the right fit? Return your order for free within 30 days.</p>
        <p className="flex gap-4">
          <Link to="/info/$page" params={{ page: "delivery" }} className={linkClass}>
            Delivery
          </Link>
          <Link to="/info/$page" params={{ page: "returns" }} className={linkClass}>
            Returns
          </Link>
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}
