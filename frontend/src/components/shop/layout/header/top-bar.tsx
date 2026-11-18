import { Link } from "@tanstack/react-router";
import { Fragment } from "react";
import { JordanJumpman } from "@/components/brand/jordan-jumpman";
import { Skeleton } from "@/components/ui/skeleton";
import { useShopDialog } from "@/lib/stores/shop-dialog";
import { useShopSession } from "@/lib/stores/shop-session";
import { AccountMenu } from "./account-menu";

const ITEM = "rounded-sm outline-none hover:text-(--sh-muted) focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50";

/** Dải trên 36px (chỉ desktop): Jumpman bên trái; Tìm cửa hàng | Trợ giúp | Tham gia | Đăng nhập bên phải (§6.1). */
export function TopBar() {
  const user = useShopSession((s) => s.user);
  const loading = useShopSession((s) => s.loading);
  const openDialog = useShopDialog((s) => s.open);

  let account: React.ReactNode[];
  if (loading && !user) {
    account = [
      <Skeleton
        key="loading"
        role="status"
        aria-label="Đang tải tài khoản"
        className="h-3 w-24 bg-(--sh-surface-hover)"
      />
    ];
  } else if (user) {
    account = [<AccountMenu key="account" user={user} variant="text" />];
  } else {
    account = [
      <button
        key="register"
        type="button"
        className={ITEM}
        onClick={() => openDialog({ type: "register" })}
        data-testid="header-register"
      >
        Tham gia
      </button>,
      <button
        key="login"
        type="button"
        className={ITEM}
        onClick={() => openDialog({ type: "login" })}
        data-testid="header-login"
      >
        Đăng nhập
      </button>
    ];
  }

  const items = [
    <Link key="store" to="/thong-tin/$trang" params={{ trang: "tim-cua-hang" }} className={ITEM}>
      Tìm cửa hàng
    </Link>,
    <Link key="help" to="/thong-tin/$trang" params={{ trang: "tro-giup" }} className={ITEM}>
      Trợ giúp
    </Link>,
    ...account
  ];

  return (
    <div className="flex h-9 items-center justify-between bg-(--sh-surface) px-12 text-xs font-medium">
      <Link
        to="/w/$danhMuc"
        params={{ danhMuc: "jordan" }}
        aria-label="Jordan"
        className={`${ITEM} inline-flex h-9 items-center`}
      >
        <JordanJumpman className="h-6" />
      </Link>
      <div className="flex items-center gap-3">
        {items.map((item, i) => (
          <Fragment key={i}>
            {i > 0 && <span aria-hidden className="h-3 w-px bg-(--sh-fg)" />}
            {item}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
