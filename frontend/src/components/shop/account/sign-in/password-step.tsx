import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { loginMutationOptions } from "@/lib/tanstack/options/account";
import { ErrorResponseWarper } from "@/lib/types/common";
import { EmailLine, PasswordField, ServerAlert, StepHeading, SubmitButton } from "./sign-in-parts";

/**
 * Bước 2a (plan dang-nhap-nike §6.3): email đã có tài khoản → nhập mật khẩu → `POST /user/authenticate`.
 * Toast "Welcome back, <tên>!" nằm ở `meta` của `loginMutationOptions`.
 */
export function PasswordStep({
  email,
  onEdit,
  onSignedIn
}: {
  email: string;
  onEdit: () => void;
  onSignedIn: () => void;
}) {
  const [error, setError] = useState<string>();
  const passwordRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    ...loginMutationOptions,
    onSuccess: onSignedIn,
    // Sai mật khẩu (hoặc bị chặn): xoá trắng ô và focus lại để nhập lần nữa (§3 E2)
    onError: () => {
      const input = passwordRef.current;
      if (input) {
        input.value = "";
        input.focus();
      }
    }
  });

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        const password = String(new FormData(e.currentTarget).get("password") ?? "");
        if (!password) {
          setError("Please enter your password.");
          return;
        }
        setError(undefined);
        mutation.mutate({ email, password });
      }}
    >
      <StepHeading>What&apos;s your password?</StepHeading>
      <EmailLine email={email} onEdit={onEdit} />

      <PasswordField
        ref={passwordRef}
        name="password"
        autoComplete="current-password"
        required
        autoFocus
        error={error}
      />

      {mutation.isError && <ServerAlert>{ErrorResponseWarper(mutation.error)}</ServerAlert>}

      <SubmitButton pending={mutation.isPending}>
        {mutation.isPending ? "Signing in…" : "Sign In"}
      </SubmitButton>
    </form>
  );
}
