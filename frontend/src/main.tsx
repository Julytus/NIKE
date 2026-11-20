import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/inter";
import "./index.css";

// Import the generated route tree
import { queryClient } from "@/lib/tanstack/query-client";
import { routeTree } from "./routeTree.gen";

// react-scan (đo re-render) chỉ nạp khi dev và khi bật VITE_REACT_SCAN=true => không vào bundle production
if (import.meta.env.DEV && import.meta.env.VITE_REACT_SCAN === "true") {
  void import("react-scan").then(({ scan }) => scan({ enabled: true }));
}

// Create a new router instance
const router = createRouter({
  routeTree,
  scrollRestoration: true, // enables built-in scroll restoration
  // Vùng cuộn chính (__root.tsx). Khoá khôi phục để mặc định (mỗi mục lịch sử một khoá): Back / Forward
  // trả lại vị trí cũ, điều hướng mới (kể cả tới pathname đã thăm) luôn về đầu trang.
  scrollToTopSelectors: ["#app-scroll"],
  scrollRestorationBehavior: "instant" // optional, can be 'smooth', 'instant', 'auto'
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Render the app
const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </StrictMode>
  );
}
