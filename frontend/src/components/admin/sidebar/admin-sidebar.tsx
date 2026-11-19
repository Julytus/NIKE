import * as React from "react";
import { Boxes, House, KeyRound, LayoutGrid, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { NikeSwoosh } from "@/components/brand/nike-swoosh";
import { AdminMain, type AdminNavItem } from "@/components/admin/sidebar/admin-main";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from "@/components/ui/sidebar";
import { useCanView } from "@/hooks/use-can-view";

/**
 * Mục menu theo quyền: `code` khớp cột `resource.code` trong DB, chỉ hiện khi role có quyền VIEW.
 * Chức năng mới (lát sau): thêm nhóm `FEATURE_ITEMS` `{ code, title, url, icon }` như nhóm dưới.
 * Backend vẫn chặn ở API nên đây chỉ là ẩn/hiện UI, không phải lớp bảo vệ.
 *
 * Nhóm "Hệ thống": các trang phân quyền (resource MODULE / RESOURCE / ROLE / PERMISSION, migration V4). */
const SYSTEM_ITEMS: (AdminNavItem & { code: string })[] = [
  { code: "ROLE", title: "Roles", url: "/admin/roles", icon: ShieldCheck },
  { code: "PERMISSION", title: "Permissions", url: "/admin/permissions", icon: KeyRound },
  { code: "RESOURCE", title: "Resources", url: "/admin/resources", icon: Boxes },
  { code: "MODULE", title: "Modules", url: "/admin/modules", icon: LayoutGrid }
];

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { canView } = useCanView();

  const navMain: AdminNavItem[] = [
    { title: "Home", url: "/admin", icon: House }
  ];
  const navSystem = SYSTEM_ITEMS.filter((i) => canView(i.code));

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/admin">
                <div className="text-sidebar-foreground flex aspect-square size-8 items-center justify-center">
                  <NikeSwoosh className="h-3.5" />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="text-base font-medium">Nike</span>
                  <span className="text-muted-foreground text-xs">Admin</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <AdminMain label="Main" items={navMain} />
        {navSystem.length > 0 && <AdminMain label="System" items={navSystem} />}
      </SidebarContent>
    </Sidebar>
  );
}
