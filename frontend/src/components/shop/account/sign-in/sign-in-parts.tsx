import { Link } from "@tanstack/react-router";
import { CircleAlert, Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { ShopButton } from "@/components/shop/ui/shop-button";
import { ShopField } from "@/components/shop/ui/shop-field";
import { Alert, AlertDescription } from "@/components/ui/alert";

/** Tiêu đề h1 của từng bước (plan dang-nhap-nike §6.1: 28px / 400). */
export function StepHeading({ children }: { children: React.ReactNode }) {
  return <h1 className="text-[28px] leading-[1.25] font-normal text-(--sh-fg)">{children}</h1>;
}

/** Dòng email đã chuẩn hoá + nút "Edit" quay lại bước email (§6.3, §6.4). */
export function EmailLine({ email, onEdit }: { email: string; onEdit: () => void }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-base">
      <span className="break-all">{email}</span>
      <button
        type="button"
        onClick={onEdit}
        className="rounded-sm text-(--sh-muted) underline underline-offset-4 outline-none hover:text-(--sh-fg) focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50"
      >
        Edit
      </button>
    </p>
  );
}

const LEGAL_LINK =
  "rounded-sm text-(--sh-fg) underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50";

/** "Privacy Policy" và "Terms of Use", mở tab mới (§6.2). */
export function LegalLinks() {
  return (
    <>
      <Link
        to="/info/$page"
        params={{ page: "privacy-policy" }}
        target="_blank"
        rel="noopener"
        className={LEGAL_LINK}
      >
        Privacy Policy
      </Link>{" "}
      and{" "}
      <Link
        to="/info/$page"
        params={{ page: "terms-of-use" }}
        target="_blank"
        rel="noopener"
        className={LEGAL_LINK}
      >
        Terms of Use
      </Link>
    </>
  );
}

/** Lỗi server, đặt ngay trên nút chính (§6.1). */
export function ServerAlert({ children }: { children: React.ReactNode }) {
  return (
    <Alert className="border-(--sh-danger)/30 bg-(--sh-bg) text-(--sh-danger)">
      <CircleAlert aria-hidden />
      <AlertDescription className="flex flex-col items-start gap-2 text-(--sh-danger)">
        {children}
      </AlertDescription>
    </Alert>
  );
}

/** Nút chính đen bo tròn, căn phải, cao 40px; đang gửi thì khoá + spinner + `aria-busy` (§6.1, §6.2). */
export function SubmitButton({
  pending,
  children
}: {
  pending: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-end">
      <ShopButton
        type="submit"
        variant="primary"
        className="h-10 rounded-[30px] px-6"
        disabled={pending}
        aria-busy={pending || undefined}
      >
        {pending && <Loader2 aria-hidden className="size-4 animate-spin" />}
        {children}
      </ShopButton>
    </div>
  );
}

type PasswordFieldProps = Omit<
  React.ComponentProps<typeof ShopField>,
  "type" | "trailing" | "label"
>;

/** Ô "Password*" có nút mắt "Show password" / "Hide password" ở mép phải (§6.3). */
export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <ShopField
      {...props}
      label="Password"
      type={visible ? "text" : "password"}
      trailing={
        <ShopButton
          variant="ghost"
          size="icon-lg"
          aria-label={visible ? "Hide password" : "Show password"}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
        </ShopButton>
      }
    />
  );
}
