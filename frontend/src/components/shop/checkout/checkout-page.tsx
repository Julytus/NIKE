import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  DELIVERY_FIELDS,
  deliverySchema,
  toCreateRequest,
  type DeliveryField,
  type DeliveryValues
} from "@/lib/shop/checkout-form";
import { useAuthStore } from "@/lib/stores/auth";
import { useCart } from "@/lib/stores/cart";
import { useShopSession } from "@/lib/stores/shop-session";
import { createCartCheckQueryOptions } from "@/lib/tanstack/options/cart";
import {
  createShopOrderMutationOptions,
  createShopOrderQueryOptions
} from "@/lib/tanstack/options/shop-order";
import type { CartItem } from "@/lib/types/cart";
import { getServerErrorMessage } from "@/lib/types/common";
import { toFieldErrors } from "@/lib/utils/form-errors";
import { CheckoutEmpty } from "./checkout-empty";
import { CHECKOUT_GRID } from "./checkout-layout";
import { CheckoutSkeleton } from "./checkout-skeleton";
import { CheckoutSummary } from "./checkout-summary";
import { DeliveryForm } from "./delivery-form";
import { PaymentMethod } from "./payment-method";

const FORM_ID = "checkout-delivery-form";
const NETWORK_ERROR = "Couldn't place your order. Please check your connection and try again.";

type FieldErrors = Partial<Record<DeliveryField, string>>;

/**
 * Trang `/checkout` (plan dat-hang §6.2 → §6.7). Giỏ đọc từ `useCart`, giá / tồn kho từ `POST /cart/public/check`
 * và được đối soát vào giỏ y như `/cart` (bỏ size không tồn tại, giảm dòng vượt tồn kho). "Place Order" gửi các dòng
 * `AVAILABLE` của lần `check` mới nhất; thành công → bỏ đúng các dòng đó khỏi giỏ, sang `/checkout/result/$code`.
 */
export function CheckoutPage() {
  const cartItems = useCart((s) => s.items);
  // Đặt xong: giữ giỏ lúc đặt cho tới khi rời trang, để trang không nháy "Your bag is empty." / gọi `check` thừa
  const [placedItems, setPlacedItems] = useState<CartItem[] | null>(null);
  const items = placedItems ?? cartItems;
  const reconcile = useCart((s) => s.reconcile);
  const removeMany = useCart((s) => s.removeMany);
  const user = useShopSession((s) => s.user);
  const sessionLoading = useShopSession((s) => s.loading);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isPlaceholderData, isError, isFetching, refetch } = useQuery(
    createCartCheckQueryOptions(items)
  );
  // Trong lần mở trang này có dòng bị tự giảm số lượng (thông báo `checkout-adjusted-notice`, §6.5)
  const [adjusted, setAdjusted] = useState(false);

  useEffect(() => {
    if (!data || isPlaceholderData) return;
    if (data.items.some((l) => l.status === "INSUFFICIENT_STOCK" && l.stock >= 1)) setAdjusted(true);
    reconcile(data.items);
  }, [data, isPlaceholderData, reconcile]);

  // `null` = khách chưa sửa ô tên → hiện tên tài khoản (kể cả khi phiên tải xong muộn, §6.3)
  const [nameInput, setNameInput] = useState<string | null>(null);
  const [rest, setRest] = useState({ phone: "", address: "", note: "" });
  const values: DeliveryValues = { receiverName: nameInput ?? user?.name ?? "", ...rest };
  const [errors, setErrors] = useState<FieldErrors>({});
  const inputRefs = useRef<Partial<Record<DeliveryField, HTMLInputElement | null>>>({});

  const [submitError, setSubmitError] = useState<string>();
  // Khoá đồng bộ chống bấm hai lần trước khi React kịp render trạng thái "đang gửi" (§6.7, TC-21)
  const submitting = useRef(false);
  const mutation = useMutation(createShopOrderMutationOptions);
  const placing = mutation.isPending || mutation.isSuccess;

  const empty = items.length === 0;
  const failed = !empty && isError && !isFetching;
  const loading = !empty && !failed && !data;
  const unavailable = !empty && !failed && !!data && !isPlaceholderData && data.itemCount === 0;

  const inCart = new Set(items.map((i) => i.sizeId));
  const lines =
    data && !failed
      ? data.items.filter((l) => l.productId !== null && l.availableQuantity > 0 && inCart.has(l.sizeId))
      : [];
  const excluded =
    !!data && !failed && data.items.some((l) => l.status === "OUT_OF_STOCK" || l.status === "UNAVAILABLE");
  const pendingReconcile = !!data && data.items.some((l) => l.status === "INSUFFICIENT_STOCK");
  const canPlace =
    !!data &&
    !failed &&
    !isFetching &&
    !(sessionLoading && !user) &&
    !pendingReconcile &&
    data.items.some((l) => l.status === "AVAILABLE");

  const handleChange = (field: DeliveryField, value: string) => {
    if (field === "receiverName") setNameInput(value);
    else setRest((r) => ({ ...r, [field]: value }));
    setErrors((e) => {
      if (!e[field]) return e;
      const next = { ...e };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting.current || !canPlace || !data) return;
    setSubmitError(undefined);

    const parsed = deliverySchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors = toFieldErrors(parsed.error) as FieldErrors;
      setErrors(fieldErrors);
      const first = DELIVERY_FIELDS.find((f) => fieldErrors[f]);
      if (first) inputRefs.current[first]?.focus();
      return;
    }
    setErrors({});

    const body = toCreateRequest(parsed.data, data.items);
    submitting.current = true;
    mutation.mutate(body, {
      onSuccess: (order) => {
        queryClient.setQueryData(createShopOrderQueryOptions(order.code).queryKey, order);
        setPlacedItems(items);
        removeMany(body.items.map((i) => i.sizeId));
        // replace: Back không quay lại form đã đặt
        void navigate({ to: "/checkout/result/$code", params: { code: order.code }, replace: true });
      },
      onError: (err) => {
        submitting.current = false;
        // Hết phiên (refresh token cũng hỏng → axios đã xoá token): về đăng nhập, giỏ giữ nguyên,
        // đăng nhập xong quay lại /checkout (kiem-thu-hoi-quy TC-05b)
        if (!useAuthStore.getState().accessToken) {
          void navigate({ to: "/signin", search: { redirect: "/checkout" }, replace: true });
          return;
        }
        setSubmitError(getServerErrorMessage(err) ?? NETWORK_ERROR);
        // Tải lại giỏ để dòng thiếu hàng được tự giảm (A3, A4)
        void refetch();
      }
    });
  };

  let body: React.ReactNode;
  if (empty) body = <CheckoutEmpty reason="empty" />;
  else if (unavailable) body = <CheckoutEmpty reason="unavailable" />;
  else if (loading) body = <CheckoutSkeleton count={items.length} />;
  else
    body = (
      <div className={CHECKOUT_GRID}>
        <div className="flex flex-col gap-10">
          <DeliveryForm
            formId={FORM_ID}
            values={values}
            errors={errors}
            inputRefs={inputRefs}
            onChange={handleChange}
            onSubmit={handleSubmit}
          />
          <PaymentMethod />
        </div>
        <div className="lg:sticky lg:top-(--sh-header-offset)">
          <CheckoutSummary
            check={failed ? null : (data ?? null)}
            lines={lines}
            excluded={excluded}
            adjusted={adjusted}
            error={submitError}
            formId={FORM_ID}
            canPlace={canPlace}
            placing={placing}
            busy={isFetching}
            onRetry={() => void refetch()}
          />
        </div>
      </div>
    );

  return (
    <div className="mx-auto flex w-full max-w-[1148px] flex-col gap-6 px-4 pt-6 pb-16 lg:gap-8 lg:px-6 lg:pt-10">
      <h1 className="text-2xl font-medium">Checkout</h1>
      {body}
    </div>
  );
}
