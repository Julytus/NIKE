import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { SignInPage } from "@/components/shop/account/sign-in/sign-in-page";
import { safeRedirect } from "@/lib/sign-in-redirect";
import { useAuthStore } from "@/lib/stores/auth";

/** `?redirect=` sai kiểu (vd số) thì bỏ, không làm vỡ trang; giá trị chuỗi được lọc lại bằng `safeRedirect`. */
const signInSearchSchema = z.object({
  redirect: z.string().optional().catch(undefined)
});

/**
 * Trang đăng nhập cửa hàng (plan dang-nhap-nike §8 bước 5). Route gốc, ngoài `_shop` (không header / footer)
 * và ngoài `_auth` (layout đó chuyển người có token sang `/admin`). Đã đăng nhập thì đi thẳng tới đích.
 */
export const Route = createFileRoute("/signin")({
  validateSearch: signInSearchSchema,
  beforeLoad: ({ search }) => {
    if (useAuthStore.getState().accessToken) {
      throw redirect({ href: safeRedirect(search.redirect), replace: true });
    }
  },
  head: () => ({
    meta: [{ title: "Sign In | Nike" }]
  }),
  component: SignInRoute
});

function SignInRoute() {
  const { redirect: target } = Route.useSearch();
  return <SignInPage redirect={target} />;
}
