import { LoginForm } from "@/components/form/block/login-form";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/login")({
  head: () => ({ meta: [{ title: "Sign In | Nike Admin" }] }),
  component: LoginForm
});
