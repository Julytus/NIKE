import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { ShopField } from "@/components/shop/ui/shop-field";
import { checkEmailMutationOptions } from "@/lib/tanstack/options/account";
import type { CheckEmailResponse } from "@/lib/types/account";
import { ErrorResponseWarper } from "@/lib/types/common";
import { LegalLinks, ServerAlert, StepHeading, SubmitButton } from "./sign-in-parts";

const emailSchema = z
  .string()
  .trim()
  .min(1, "Please enter your email.")
  .max(255, "Please enter a valid email address.")
  .email("Please enter a valid email address.");

/** Bước 1 (plan dang-nhap-nike §6.2): nhập email → check-email → bước mật khẩu hoặc tạo tài khoản. */
export function EmailStep({
  defaultEmail,
  onChecked
}: {
  defaultEmail: string;
  onChecked: (result: CheckEmailResponse) => void;
}) {
  const [error, setError] = useState<string>();
  const mutation = useMutation({ ...checkEmailMutationOptions, onSuccess: onChecked });

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        const parsed = emailSchema.safeParse(new FormData(e.currentTarget).get("email") ?? "");
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message);
          return;
        }
        setError(undefined);
        mutation.mutate(parsed.data);
      }}
    >
      <StepHeading>Enter your email to join us or sign in.</StepHeading>
      <p className="text-sm">Vietnam</p>

      <ShopField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        autoFocus
        defaultValue={defaultEmail}
        error={error}
      />

      <p className="text-sm text-(--sh-muted)">
        By continuing, I agree to Nike&apos;s <LegalLinks />.
      </p>

      {mutation.isError && <ServerAlert>{ErrorResponseWarper(mutation.error)}</ServerAlert>}

      <SubmitButton pending={mutation.isPending}>Continue</SubmitButton>

      {import.meta.env.DEV && (
        <p
          data-testid="signin-dev-hint"
          className="rounded-[8px] border border-dashed border-(--sh-border) p-2 text-xs text-(--sh-muted)"
        >
          Test account: <b>free@nike.local</b>, password <b>Admin@123</b>
        </p>
      )}
    </form>
  );
}
