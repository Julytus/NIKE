import { Link, useLocation } from "@tanstack/react-router";
import { Fragment } from "react";
import { JordanJumpman } from "@/components/brand/jordan-jumpman";
import { Skeleton } from "@/components/ui/skeleton";
import { signInSearch } from "@/lib/sign-in-redirect";
import { useShopSession } from "@/lib/stores/shop-session";
import { AccountMenu } from "./account-menu";

const ITEM = "rounded-sm outline-none hover:text-(--sh-muted) focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50";

/** Dải trên 36px (chỉ desktop): Jumpman bên trái; Find a Store | Help | Join Us | Sign In bên phải (§6.1). */
export function TopBar() {
  const user = useShopSession((s) => s.user);
  const loading = useShopSession((s) => s.loading);
  const location = useLocation();

  let account: React.ReactNode[];
  if (loading && !user) {
    account = [
      <Skeleton
        key="loading"
        role="status"
        aria-label="Loading account"
        className="h-3 w-24 bg-(--sh-surface-hover)"
      />
    ];
  } else if (user) {
    account = [<AccountMenu key="account" user={user} variant="text" />];
  } else {
    account = [
      <Link key="register" to="/signin" search={signInSearch(location)} className={ITEM} data-testid="header-register">
        Join Us
      </Link>,
      <Link key="login" to="/signin" search={signInSearch(location)} className={ITEM} data-testid="header-login">
        Sign In
      </Link>
    ];
  }

  const items = [
    <Link key="store" to="/info/$page" params={{ page: "find-a-store" }} className={ITEM}>
      Find a Store
    </Link>,
    <Link key="help" to="/info/$page" params={{ page: "help" }} className={ITEM}>
      Help
    </Link>,
    ...account
  ];

  return (
    <div className="flex h-9 items-center justify-between bg-(--sh-surface) px-12 text-xs font-semibold">
      <Link
        to="/w/$category"
        params={{ category: "jordan" }}
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
