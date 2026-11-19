import type { RefObject } from "react";
import { ShopField } from "@/components/shop/ui/shop-field";
import type { DeliveryField, DeliveryValues } from "@/lib/shop/checkout-form";

const HEADING_ID = "checkout-delivery-title";

/**
 * Khối "Delivery" (plan dat-hang §6.3): form giao hàng có điều khiển — giá trị, lỗi và submit do `CheckoutPage` giữ
 * (nút "Place Order" nằm ở cột Order Summary, nối với form bằng thuộc tính `form`).
 */
export function DeliveryForm({
  formId,
  values,
  errors,
  inputRefs,
  onChange,
  onSubmit
}: {
  formId: string;
  values: DeliveryValues;
  errors: Partial<Record<DeliveryField, string>>;
  inputRefs: RefObject<Partial<Record<DeliveryField, HTMLInputElement | null>>>;
  onChange: (field: DeliveryField, value: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  const field = (name: DeliveryField) => ({
    name,
    value: values[name],
    error: errors[name],
    ref: (el: HTMLInputElement | null) => {
      inputRefs.current[name] = el;
    },
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(name, e.target.value)
  });

  return (
    <section data-testid="checkout-delivery" aria-labelledby={HEADING_ID} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 id={HEADING_ID} className="text-xl font-medium">
          Delivery
        </h2>
        <p className="text-base text-(--sh-muted)">Where should we send your order?</p>
      </div>
      <form id={formId} noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <ShopField label="Full Name" type="text" autoComplete="name" required {...field("receiverName")} />
        <ShopField
          label="Phone Number"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          required
          hint="10 digits, starting with 0"
          {...field("phone")}
        />
        <ShopField
          label="Address"
          type="text"
          autoComplete="street-address"
          required
          hint="House number, street, ward, district and city"
          {...field("address")}
        />
        <ShopField label="Delivery Notes" type="text" hint="Optional" {...field("note")} />
      </form>
    </section>
  );
}
