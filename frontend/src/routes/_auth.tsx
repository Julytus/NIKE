import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { NikeSwoosh } from "@/components/brand/nike-swoosh";
import { ThemeToggle } from "@/components/layout/theme/theme-toggle";
import { useNikeTheme } from "@/hooks/use-nike-theme";
import { useAuthStore } from "@/lib/stores/auth";

/** Layout cho các trang chưa đăng nhập (login). Đã có token thì vào thẳng trang quản trị. */
export const Route = createFileRoute("/_auth")({
  beforeLoad: ({ location }) => {
    if (location.pathname !== "/logout" && useAuthStore.getState().accessToken) {
      throw redirect({ to: "/admin" });
    }
  },
  component: AuthLayout
});

/** Kiểu trang đăng nhập nike.com: nền trắng, một cột giữa rộng ~460px, logo trên tiêu đề. */
function AuthLayout() {
  useNikeTheme();

  return (
    <div className="bg-background relative min-h-screen">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <main className="mx-auto w-full max-w-[460px] px-4 pt-8 pb-16 sm:pt-10">
        <div className="mb-8 flex items-center gap-3" aria-label="Nike">
          <NikeSwoosh className="h-6" />
        </div>
        <Outlet />
      </main>
    </div>
  );
}
