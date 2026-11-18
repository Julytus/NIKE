import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Nút của khu cửa hàng kiểu Nike: bo tròn 30px, nút chính nền đen (plan giao-dien-nike §6.8).
 * Bo góc ghi bằng px vì token `--radius` của dự án (1rem) dành cho trang quản trị.
 */
const shopButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap text-base font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-(--sh-primary) text-white hover:bg-(--sh-primary-hover)",
        secondary: "bg-(--sh-surface) text-(--sh-fg) hover:bg-(--sh-surface-hover)",
        outline: "border border-(--sh-input-border) bg-(--sh-bg) text-(--sh-fg) hover:border-(--sh-fg)",
        ghost: "text-(--sh-fg) hover:bg-(--sh-surface)",
        overlay: "text-white hover:bg-white/15"
      },
      size: {
        sm: "h-9 rounded-[30px] px-4 text-sm",
        md: "h-12 rounded-[30px] px-6",
        "icon-sm": "size-7 rounded-full [&_svg]:size-4",
        icon: "size-8 rounded-full [&_svg]:size-5",
        "icon-lg": "size-10 rounded-full [&_svg]:size-6",
        "icon-square": "size-10 rounded-[8px] [&_svg]:size-5"
      }
    },
    defaultVariants: { variant: "secondary", size: "md" }
  }
);

export interface ShopButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof shopButtonVariants> {
  asChild?: boolean;
}

export function ShopButton({ className, variant, size, asChild, type, ...props }: ShopButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      type={asChild ? undefined : (type ?? "button")}
      className={cn(shopButtonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
