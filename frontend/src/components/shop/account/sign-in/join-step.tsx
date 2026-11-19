import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { ShopCheckbox, ShopField } from "@/components/shop/ui/shop-field";
import { apiErrorOf } from "@/lib/axios/error";
import { registerMutationOptions } from "@/lib/tanstack/options/account";
import { ErrorResponseWarper } from "@/lib/types/common";
import {
  EmailLine,
  LegalLinks,
  PasswordField,
  ServerAlert,
  StepHeading,
  SubmitButton
} from "./sign-in-parts";

/** Chuỗi lỗi giữ nguyên như form đăng ký cũ (plan dang-nhap-nike §6.4). */
const joinSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Please enter your full name.")
    .max(100, "Full name must be at most 100 characters."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password must be at most 72 characters.")
    .regex(/[A-Za-z]/, "Password must contain a letter.")
    .regex(/[0-9]/, "Password must contain a number."),
  terms: z.literal("on", { error: "You must agree to the terms to continue." })
});

type Field = keyof z.infer<typeof joinSchema>;
type Errors = Partial<Record<Field, string>>;

/**
 * Bước 2b (§6.4): email chưa có tài khoản → họ tên + mật khẩu + điều khoản → `POST /account/register`.
 * Email vừa bị đăng ký ở nơi khác (`EMAIL_EXISTS`) thì cho chuyển sang bước mật khẩu với cùng email.
 */
export function JoinStep({
  email,
  onEdit,
  onSignInInstead,
  onJoined
}: {
  email: string;
  onEdit: () => void;
  onSignInInstead: () => void;
  onJoined: () => void;
}) {
  const [errors, setErrors] = useState<Errors>({});
  const mutation = useMutation({ ...registerMutationOptions, onSuccess: onJoined });
  const emailTaken = mutation.isError && apiErrorOf(mutation.error).errorCode === "EMAIL_EXISTS";

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        const parsed = joinSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
        if (!parsed.success) {
          const fe = z.flattenError(parsed.error).fieldErrors as Partial<Record<Field, string[]>>;
          setErrors({ name: fe.name?.[0], password: fe.password?.[0], terms: fe.terms?.[0] });
          return;
        }
        setErrors({});
        mutation.mutate({ name: parsed.data.name, email, password: parsed.data.password });
      }}
    >
      <StepHeading>Now let&apos;s make you a Nike Member.</StepHeading>
      <EmailLine email={email} onEdit={onEdit} />

      <div className="flex flex-col gap-4">
        <ShopField
          label="Full name"
          name="name"
          autoComplete="name"
          required
          autoFocus
          error={errors.name}
        />
        <PasswordField
          name="password"
          autoComplete="new-password"
          required
          hint="At least 8 characters, with letters and numbers"
          error={errors.password}
        />
      </div>

      <ShopCheckbox
        name="terms"
        error={errors.terms}
        label={
          <>
            I agree to Nike&apos;s <LegalLinks />.
          </>
        }
      />

      {mutation.isError && (
        <ServerAlert>
          <span>{ErrorResponseWarper(mutation.error)}</span>
          {emailTaken && (
            <button
              type="button"
              onClick={onSignInInstead}
              className="rounded-sm font-semibold text-(--sh-fg) underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50"
            >
              Sign in with this email
            </button>
          )}
        </ServerAlert>
      )}

      <SubmitButton pending={mutation.isPending}>
        {mutation.isPending ? "Creating account…" : "Create Account"}
      </SubmitButton>
    </form>
  );
}
