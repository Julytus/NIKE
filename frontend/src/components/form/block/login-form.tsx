"use client";

import { useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { useAppForm } from "@/components/form/hooks";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { useMutation } from "@tanstack/react-query";
import { createLoginMutationOptions } from "@/lib/tanstack/options/auth";
import type { LoginApiRequest } from "@/lib/types/auth";
import { useAuthStore } from "@/lib/stores/auth";

const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, "Please enter your email or phone number")
    .refine(
      (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || /^[0-9]{8,15}$/.test(v),
      "Invalid email or phone number"
    ),
  // Đăng nhập chỉ cần có mật khẩu: tài khoản cũ có thể đặt mật khẩu trước khi có quy tắc 8 ký tự
  password: z.string().min(1, "Please enter your password"),
  rememberMe: z.boolean().optional()
});

const isEmail = (v: string) => v.includes("@");

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const navigate = useNavigate();
  const set = useAuthStore((s) => s.set);
  const mutation = useMutation({
    ...createLoginMutationOptions(),
    onSuccess: (data) => {
      set({
        accessToken: data.token,
        refreshToken: data.refreshToken,
        userId: data.userId,
        remember: form.state.values.rememberMe !== false
      });
      form.reset();
      navigate({ to: "/admin" });
    }
  });
  const form = useAppForm({
    defaultValues: {
      identifier: "",
      password: "",
      rememberMe: true
    } satisfies LoginFormData as LoginFormData,
    validators: {
      onSubmit: loginSchema
    },
    onSubmit: async ({ value }) => {
      const payload: LoginApiRequest = isEmail(value.identifier)
        ? { email: value.identifier, plainPassword: value.password }
        : { phone: value.identifier, plainPassword: value.password };

      mutation.mutate(payload);
    }
  });

  return (
    <div className="nike-login space-y-6">
      <div className="space-y-2">
        <h4 className="text-[28px] leading-tight font-medium tracking-normal">Sign In</h4>
        <p className="text-muted-foreground text-base">Nike store admin.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="space-y-6"
      >
        <FieldGroup className="gap-5">
          <form.AppField name="identifier">
            {(field) => (
              <field.Input
                label="Email or phone number*"
                placeholder="e.g. example@gmail.com or 0987654321"
                description=""
              />
            )}
          </form.AppField>

          <form.AppField name="password">
            {(field) => <field.Password label="Password*" description="" />}
          </form.AppField>

          <form.AppField name="rememberMe">
            {(field) => <field.Checkbox label="Remember me" />}
          </form.AppField>

          <p className="text-muted-foreground text-xs leading-relaxed">
            Self sign-up is not available. An administrator will create your account and grant permissions.
          </p>

          <div className="flex justify-end">
            <Button
              type="submit"
              size="lg"
              className="h-12 px-8 text-base font-medium"
              disabled={form.state.isSubmitting}
            >
              {form.state.isSubmitting ? "Signing in..." : "Sign In"}
            </Button>
          </div>
        </FieldGroup>
      </form>
    </div>
  );
}
