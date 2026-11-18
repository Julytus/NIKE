import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronDown, LayoutDashboard, LogOut } from "lucide-react";
import { ShopButton } from "@/components/shop/ui/shop-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useShopDialog } from "@/lib/stores/shop-dialog";
import { useShopSession } from "@/lib/stores/shop-session";
import { logoutMutationOptions } from "@/lib/tanstack/options/account";
import { permissionResourceQueryOptions } from "@/lib/tanstack/options/auth";
import type { ShopUserDTO } from "@/lib/types/account";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

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

function AccountMenu({ user }: { user: ShopUserDTO }) {
  const logoutMutation = useMutation(logoutMutationOptions);
  const canOpenAdmin = useCanOpenAdmin(user);

  return (
    // modal=false: không ẩn (aria-hidden) phần còn lại của trang khi mở menu
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        {/* Tên đọc = chữ đang hiện ("Tài khoản " + tên), không dùng aria-label khác chữ (WCAG 2.5.3) */}
        <ShopButton variant="ghost" className="gap-2 pr-2 pl-1.5" data-testid="account-menu-trigger">
          <span
            aria-hidden
            className="flex size-8 items-center justify-center rounded-full bg-(--sh-fg) text-xs font-bold text-(--sh-bg)"
          >
            {initials(user.name)}
          </span>
          <span className="sr-only">Tài khoản </span>
          <span className="sr-only max-w-32 truncate md:not-sr-only">{user.name}</span>
          <ChevronDown className="size-4" />
        </ShopButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="shop w-64 border-(--sh-border) bg-(--sh-elevated) text-(--sh-fg)">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate">{user.name}</span>
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

/** Cụm nút bên phải header: chưa đăng nhập → Đăng nhập / Đăng ký; đã đăng nhập → menu tài khoản. */
export function HeaderActions() {
  const user = useShopSession((s) => s.user);
  const loading = useShopSession((s) => s.loading);
  const openDialog = useShopDialog((s) => s.open);

  if (loading && !user) {
    return (
      <Skeleton role="status" aria-label="Đang tải tài khoản" className="size-8 rounded-full bg-(--sh-surface)" />
    );
  }

  if (!user) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <ShopButton variant="secondary" onClick={() => openDialog({ type: "login" })} data-testid="header-login">
          Đăng nhập
        </ShopButton>
        <ShopButton variant="primary" onClick={() => openDialog({ type: "register" })} data-testid="header-register">
          Đăng ký
        </ShopButton>
      </div>
    );
  }

  return <AccountMenu user={user} />;
}
