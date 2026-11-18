import { X } from "lucide-react";
import { ShopButton } from "@/components/shop/ui/shop-button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useShopDialog, type ShopDialog } from "@/lib/stores/shop-dialog";
import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";

/** Tiêu đề + mô tả theo loại hộp thoại (mô tả nối với hộp thoại qua aria-describedby) */
const HEADINGS: Record<ShopDialog["type"], { title: string; description: string }> = {
  login: { title: "Đăng nhập", description: "Đăng nhập để mua sắm và theo dõi đơn hàng." },
  register: { title: "Tạo tài khoản", description: "Tham gia để mua sắm và theo dõi đơn hàng." }
};

/** Hộp thoại đăng nhập / đăng ký của cửa hàng, render một lần ở `ShopShell`. Mở bằng `useShopDialog().open(...)`. */
export function ShopDialogs() {
  const dialog = useShopDialog((s) => s.dialog);
  const open = useShopDialog((s) => s.open);
  const close = useShopDialog((s) => s.close);

  const heading = dialog ? HEADINGS[dialog.type] : null;

  return (
    <Dialog open={!!dialog} onOpenChange={(o) => !o && close()}>
      {dialog && heading && (
        <DialogContent
          key={dialog.type}
          showCloseButton={false}
          className="shop max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-[12px] border-(--sh-border) bg-(--sh-elevated) p-6 text-(--sh-fg) sm:max-w-[420px] sm:p-8"
        >
          <DialogClose asChild>
            <ShopButton variant="ghost" size="icon-sm" aria-label="Đóng" className="absolute top-4 right-4">
              <X />
            </ShopButton>
          </DialogClose>

          <DialogTitle className="font-display pr-8 text-2xl leading-tight font-bold">{heading.title}</DialogTitle>
          <DialogDescription className="mt-2 mb-6 text-sm text-(--sh-muted)">{heading.description}</DialogDescription>

          {dialog.type === "login" && (
            <LoginForm
              defaultEmail={dialog.email}
              onSuccess={close}
              onSwitchToRegister={() => open({ type: "register" })}
            />
          )}
          {dialog.type === "register" && (
            <RegisterForm onSuccess={close} onSwitchToLogin={(email) => open({ type: "login", email })} />
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}
