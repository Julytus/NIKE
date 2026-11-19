import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { LayoutDashboard, LogOut, UserRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { logoutMutationOptions } from "@/lib/tanstack/options/account";
import { permissionResourceQueryOptions } from "@/lib/tanstack/options/auth";
import type { ShopUserDTO } from "@/lib/types/account";
import { cn } from "@/lib/utils";

/**
 * Mục "Trang quản trị" chỉ hiện với tài khoản toàn quyền hoặc có quyền VIEW bất kỳ (plan go-lut §6.1).
 * Lỗi khi lấy quyền thì ẩn (backend vẫn chặn ở API, đây chỉ là đường tắt giao diện).
 */
function useCanOpenAdmin(user: ShopUserDTO) {
  const { data: resources } = useQuery({
    ...permissionResourceQueryOptions(),
    enabled: user.isOperator !== 1
  });
  return user.isOperator === 1 || !!resources?.some((r) => r.actions.includes("VIEW"));
}

/**
 * Menu tài khoản, trigger tên "Xin chào, <tên>" (plan giao-dien-nike §6.1).
 * `variant="text"`: chữ 12px ở dải trên (desktop); `"icon"`: icon người ở thanh chính (mobile).
 */
export function AccountMenu({ user, variant }: { user: ShopUserDTO; variant: "text" | "icon" }) {
  const logoutMutation = useMutation(logoutMutationOptions);
  const canOpenAdmin = useCanOpenAdmin(user);
  const greeting = `Xin chào, ${user.name}`;

  return (
    // modal=false: không ẩn (aria-hidden) phần còn lại của trang khi mở menu
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-testid="account-menu-trigger"
          aria-label={variant === "icon" ? greeting : undefined}
          className={cn(
            "inline-flex items-center outline-none focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50",
            variant === "text"
              ? "max-w-60 truncate rounded-sm hover:text-(--sh-muted)"
              : "size-10 justify-center rounded-full hover:bg-(--sh-surface-hover) [&_svg]:size-6"
          )}
        >
          {variant === "text" ? greeting : <UserRound aria-hidden />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="shop w-64 rounded-[12px] border-(--sh-border) bg-(--sh-bg) text-(--sh-fg)"
      >
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate font-medium">{user.name}</span>
          <span className="truncate text-xs font-normal text-(--sh-muted)">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {canOpenAdmin && (
          <DropdownMenuItem asChild>
            <Link to="/admin" data-testid="account-menu-admin">
              <LayoutDashboard /> Trang quản trị
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => logoutMutation.mutate()} data-testid="account-menu-logout">
          <LogOut /> Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
