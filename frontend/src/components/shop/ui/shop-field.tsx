import { useId } from "react";
import { cn } from "@/lib/utils";

interface ShopFieldProps extends Omit<React.ComponentProps<"input">, "id" | "placeholder"> {
  /** Nhãn nổi trong ô, cũng là tên truy cập của ô (không kèm dấu `*`) */
  label: string;
  error?: string;
  /** Gợi ý xám 12px dưới ô */
  hint?: string;
  /** Nút nằm ở mép phải trong ô (vd nút hiện / ẩn mật khẩu) */
  trailing?: React.ReactNode;
}

/**
 * Ô nhập kiểu nike.com (plan dang-nhap-nike §6.1): cao 56px, bo 8px, nhãn nổi trong ô — nằm giữa khi trống,
 * thu nhỏ lên trên khi focus / có chữ. `required` thêm dấu `*` sau nhãn (dấu này không vào tên truy cập).
 * Lỗi và gợi ý nối với ô bằng `aria-describedby` để trình đọc màn hình đọc được.
 */
export function ShopField({
  label,
  error,
  hint,
  trailing,
  required,
  className,
  ...props
}: ShopFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="relative">
        <input
          id={id}
          // Placeholder rỗng để CSS biết ô đang trống (`:placeholder-shown`) mà đặt nhãn nổi
          placeholder=" "
          aria-label={label}
          aria-required={required || undefined}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          className={cn(
            "peer h-14 w-full rounded-[8px] border border-(--sh-input-border) bg-transparent px-4 pt-5 pb-1 text-base text-(--sh-fg) transition-colors outline-none",
            "focus-visible:border-(--sh-fg) focus-visible:ring-1 focus-visible:ring-(--sh-fg)",
            trailing && "pr-14",
            error &&
              "border-(--sh-danger) focus-visible:border-(--sh-danger) focus-visible:ring-(--sh-danger)"
          )}
          {...props}
        />
        <label
          htmlFor={id}
          className={cn(
            "pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-base text-(--sh-muted) transition-all duration-150",
            "peer-focus:top-4 peer-focus:text-xs peer-[:not(:placeholder-shown)]:top-4 peer-[:not(:placeholder-shown)]:text-xs",
            error && "text-(--sh-danger)"
          )}
        >
          {label}
          {required && <span aria-hidden="true">*</span>}
        </label>
        {trailing && <div className="absolute top-1/2 right-2 -translate-y-1/2">{trailing}</div>}
      </div>
      {error && (
        <p id={errorId} className="px-4 text-xs text-(--sh-danger)">
          {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className="px-4 text-xs text-(--sh-muted)">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Ô tích có nhãn (đồng ý điều khoản, hiện mật khẩu…) */
export function ShopCheckbox({
  label,
  error,
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "type" | "id"> & {
  label: React.ReactNode;
  error?: string;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="flex cursor-pointer items-start gap-2 text-sm text-(--sh-muted)"
      >
        <input
          id={id}
          type="checkbox"
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-0.5 size-4 shrink-0 accent-(--sh-primary)"
          {...props}
        />
        <span>{label}</span>
      </label>
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs font-medium text-(--sh-danger)">
          {error}
        </p>
      )}
    </div>
  );
}
