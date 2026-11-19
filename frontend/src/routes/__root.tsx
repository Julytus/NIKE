import { ThemeProvider } from "@/components/layout/theme/theme-provider";
import { NotFoundPage } from "@/components/not-found-page";
import { Toaster } from "@/components/ui/sonner";
import { createRootRoute, HeadContent, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";

/**
 * Khung gốc: vùng cuộn toàn màn hình. Dùng `div` (không phải `main`) để mỗi layout con tự có
 * `header` / `main` / `footer` đúng landmark (banner, main, contentinfo).
 * `HeadContent` áp `head()` của route (vd `<title>` của trang chủ).
 */
const RootLayout = () => {
  const location = useLocation();
  useEffect(() => {
    // Vùng cuộn là `#app-scroll` (không phải window): về đầu trang khi đổi đường dẫn
    document.getElementById("app-scroll")?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);
  return (
    <>
      <HeadContent />
      <ThemeProvider defaultTheme="light" storageKey="downbeat-ui-theme">
        <div
          id="app-scroll"
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
