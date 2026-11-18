import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, CircleHelp, Heart, ShoppingBag, X } from "lucide-react";
import { useRef, useState } from "react";
import { JordanJumpman } from "@/components/brand/jordan-jumpman";
import { CatalogLink } from "@/components/shop/catalog-link";
import { ShopButton } from "@/components/shop/ui/shop-button";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { NAV_ITEMS } from "@/lib/shop/catalog-search";
import { useShopDialog, type ShopDialog } from "@/lib/stores/shop-dialog";
import { useShopSession } from "@/lib/stores/shop-session";
import { logoutMutationOptions } from "@/lib/tanstack/options/account";
import { useNavGroups } from "./nav-groups";

const BIG_ITEM =
  "flex w-full items-center justify-between py-2 text-2xl font-medium outline-none focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50 rounded-sm";
const SMALL_LINK =
  "flex items-center gap-4 rounded-sm py-2 text-base font-medium outline-none focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50";

/**
 * Menu trượt trên điện thoại (plan giao-dien-nike §6.3): dialog "Menu" từ phải, danh sách chính
 * hoặc panel con của một mục. Bấm link → đóng menu rồi điều hướng.
 */
export function MobileMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [panel, setPanel] = useState<number | null>(null);
  // Hộp thoại tài khoản chỉ mở sau khi menu đóng hẳn, tránh hai lớp modal tranh focus
  const pendingDialog = useRef<ShopDialog | null>(null);
  const openDialog = useShopDialog((s) => s.open);

  const close = () => onOpenChange(false);

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setPanel(null);
      }}
    >
      <SheetContent
        side="right"
        showCloseButton={false}
        aria-describedby={undefined}
        onCloseAutoFocus={(e) => {
          const next = pendingDialog.current;
          if (next) {
            e.preventDefault();
            pendingDialog.current = null;
            openDialog(next);
          }
        }}
        className="shop w-full gap-0 overflow-y-auto border-none bg-(--sh-bg) px-9 pt-4 pb-10 text-(--sh-fg) sm:max-w-none"
      >
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <div className="-mr-3 mb-6 flex justify-end">
          <SheetClose
            aria-label="Đóng menu"
            className="flex size-10 items-center justify-center rounded-full outline-none hover:bg-(--sh-surface-hover) focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50"
          >
            <X aria-hidden className="size-6" />
          </SheetClose>
        </div>

        {panel === null ? (
          <MainList
            onOpenPanel={setPanel}
            onNavigate={close}
            onDialog={(d) => {
              pendingDialog.current = d;
              close();
            }}
          />
        ) : (
          <SubPanel index={panel} onBack={() => setPanel(null)} onNavigate={close} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function MainList({
  onOpenPanel,
  onNavigate,
  onDialog
}: {
  onOpenPanel: (i: number) => void;
  onNavigate: () => void;
  onDialog: (d: ShopDialog) => void;
}) {
  const user = useShopSession((s) => s.user);
  const logoutMutation = useMutation(logoutMutationOptions);

  return (
    <div className="flex flex-col">
      <ul className="flex flex-col gap-2">
        {NAV_ITEMS.map((item, i) => (
          <li key={item.label}>
            <button type="button" className={BIG_ITEM} onClick={() => onOpenPanel(i)}>
              {item.label}
              <ChevronRight aria-hidden className="size-6" />
            </button>
          </li>
        ))}
      </ul>

      <Link
        to="/w/$danhMuc"
        params={{ danhMuc: "jordan" }}
        onClick={onNavigate}
        className={`${SMALL_LINK} mt-8`}
      >
        <JordanJumpman className="h-6" />
        Jordan
      </Link>

      <div className="mt-10 flex flex-col gap-6">
        {user ? (
          <>
            <p className="text-2xl font-medium">{`Xin chào, ${user.name}`}</p>
            <ShopButton
              variant="outline"
              className="self-start"
              onClick={() => {
                logoutMutation.mutate();
                onNavigate();
              }}
            >
              Đăng xuất
            </ShopButton>
          </>
        ) : (
          <>
            <p className="text-2xl font-medium text-(--sh-muted)">
              Trở thành thành viên Nike để mua sắm nhanh hơn và theo dõi đơn hàng.
            </p>
            <div className="flex gap-3">
              <ShopButton variant="primary" size="sm" onClick={() => onDialog({ type: "register" })}>
                Tham gia
              </ShopButton>
              <ShopButton variant="outline" size="sm" onClick={() => onDialog({ type: "login" })}>
                Đăng nhập
              </ShopButton>
            </div>
          </>
        )}
      </div>

      <ul className="mt-10 flex flex-col gap-2">
        <li>
          <Link to="/yeu-thich" onClick={onNavigate} className={SMALL_LINK}>
            <Heart aria-hidden className="size-6" /> Yêu thích
          </Link>
        </li>
        <li>
          <Link to="/gio-hang" onClick={onNavigate} className={SMALL_LINK}>
            <ShoppingBag aria-hidden className="size-6" /> Giỏ hàng
          </Link>
        </li>
        <li>
          <Link to="/thong-tin/$trang" params={{ trang: "tro-giup" }} onClick={onNavigate} className={SMALL_LINK}>
            <CircleHelp aria-hidden className="size-6" /> Trợ giúp
          </Link>
        </li>
      </ul>
    </div>
  );
}

function SubPanel({ index, onBack, onNavigate }: { index: number; onBack: () => void; onNavigate: () => void }) {
  const item = NAV_ITEMS[index]!;
  const groups = useNavGroups(item.scope);

  return (
    <div className="flex flex-col">
      {/* Chữ hiển thị "Tất cả" như nike.com; tên đọc "Quay lại" cho rõ hành động (plan §12) */}
      <button
        type="button"
        aria-label="Quay lại"
        onClick={onBack}
        className="-ml-1 flex items-center gap-2 self-start rounded-sm py-2 text-base font-medium outline-none focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50"
      >
        <ChevronLeft aria-hidden className="size-6" />
        Tất cả
      </button>
      <h2 className="mt-4 text-2xl font-medium">{item.label}</h2>
      <Link to="/w" search={item.search} onClick={onNavigate} className={`${SMALL_LINK} mt-4 underline underline-offset-4`}>
        Xem tất cả
      </Link>
      {groups.map((group) => (
        <div key={group.title} className="mt-8">
          <p className="mb-2 text-base font-medium text-(--sh-muted)">{group.title}</p>
          <ul className="flex flex-col">
            {group.links.map((link) => (
              <li key={link.label}>
                <CatalogLink dest={link.target} onClick={onNavigate} className={SMALL_LINK}>
                  {link.label}
                </CatalogLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
