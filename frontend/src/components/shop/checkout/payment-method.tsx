import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const HEADING_ID = "checkout-payment-title";
const COD_ID = "checkout-payment-cod";

/**
 * Khối "Payment" (plan dat-hang §6.4): một lựa chọn "Cash on Delivery" đã chọn sẵn.
 * Lát `thanh-toan-payos` thêm lựa chọn thứ hai vào `RadioGroup` này.
 */
export function PaymentMethod() {
  return (
    <section data-testid="checkout-payment" aria-labelledby={HEADING_ID} className="flex flex-col gap-4">
      <h2 id={HEADING_ID} className="text-xl font-medium">
        Payment
      </h2>
      <RadioGroup aria-label="Payment Method" value="COD" className="gap-3">
        <label
          htmlFor={COD_ID}
          className="flex cursor-pointer items-start gap-3 rounded-[12px] border border-(--sh-fg) p-4"
        >
          <RadioGroupItem
            id={COD_ID}
            value="COD"
            aria-labelledby={`${COD_ID}-label`}
            aria-describedby={`${COD_ID}-desc`}
            className="mt-0.5 size-5 border-(--sh-fg) text-(--sh-fg) [&_svg]:size-2.5 [&_svg]:fill-(--sh-fg)"
          />
          <span className="flex flex-col gap-0.5">
            <span id={`${COD_ID}-label`} className="text-base font-medium">
              Cash on Delivery
            </span>
            <span id={`${COD_ID}-desc`} className="text-sm text-(--sh-muted)">
              Pay in cash when your order arrives.
            </span>
          </span>
        </label>
      </RadioGroup>
    </section>
  );
}
