import { cn } from "@/lib/utils";

/** Logo swoosh (dùng cho mục đích học tập, chạy local). Màu theo `currentColor`. */
export function NikeSwoosh({ className }: { className?: string }) {
  return (
    <svg
      viewBox="3 8.5 18.2 6.7"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={cn("h-5 w-auto", className)}
    >
      <path d="M21 8.719L7.836 14.303C6.74 14.768 5.818 15 5.075 15c-.836 0-1.445-.295-1.819-.884-.485-.76-.273-1.982.559-3.272.494-.754 1.122-1.446 1.734-2.108-.144.234-1.415 2.349-.025 3.345.275.2.666.298 1.147.298.386 0 .829-.063 1.316-.19L21 8.719z" />
    </svg>
  );
}
