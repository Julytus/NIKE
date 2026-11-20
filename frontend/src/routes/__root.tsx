import { ThemeProvider } from "@/components/layout/theme/theme-provider";
import { NotFoundPage } from "@/components/not-found-page";
import { Toaster } from "@/components/ui/sonner";
import { createRootRoute, HeadContent, Outlet, useLocation, useRouter } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

/**
 * Khung gốc: vùng cuộn toàn màn hình. Dùng `div` (không phải `main`) để mỗi layout con tự có
 * `header` / `main` / `footer` đúng landmark (banner, main, contentinfo).
 * `HeadContent` áp `head()` của route (vd `<title>` của trang chủ).
 */
const RootLayout = () => {
  const router = useRouter();
  const location = useLocation();
  const lastAction = useRef<string>("PUSH");
  useEffect(
    () =>
      router.history.subscribe(({ action }) => {
        lastAction.current = action.type;
      }),
    [router]
  );
  useEffect(() => {
    // Vùng cuộn là `#app-scroll` (không phải window). Điều hướng mới → về đầu trang (kể cả khi router
    // lỡ ghi vị trí cuộn của trang trước vào khoá trang mới do throttle 100ms). Back / Forward / Go thì
    // để router khôi phục vị trí cũ (`scrollRestoration` trong main.tsx) — cuộn về đầu ở đây sẽ đè lên.
    if (lastAction.current !== "PUSH" && lastAction.current !== "REPLACE") return;
    document.getElementById("app-scroll")?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);
  return (
    <>
      <HeadContent />
      <ThemeProvider defaultTheme="light" storageKey="nike-ui-theme">
        <div
          id="app-scroll"
          // Firefox cho vùng cuộn nhận Tab → Tab đầu tiên không tới link "Skip to main content"
          tabIndex={-1}
          className="bg-background text-foreground relative flex h-screen w-full flex-col overflow-y-scroll"
        >
          <Outlet />
          <Toaster />
        </div>
      </ThemeProvider>
    </>
  );
};

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: () => <NotFoundPage />
});
