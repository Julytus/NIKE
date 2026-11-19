import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { meQueryOptions } from "@/lib/tanstack/options/auth";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Dashboard | Nike Admin" }] }),
  component: AdminHomePage
});

/** Trang chào của quản trị (plan go-lut §6.2); bảng số liệu giày làm lại ở lát `dashboard-giay`. */
function AdminHomePage() {
  const { data: me } = useQuery(meQueryOptions);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{me?.name ? `Hi, ${me.name}` : "Hi there"}</h1>
        <p className="text-muted-foreground">Pick a feature from the sidebar to get started.</p>
      </div>
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Current sign-in details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>Email: {me?.email ?? "—"}</p>
          <p>Role: {me?.roleName ?? "—"}</p>
        </CardContent>
      </Card>
    </div>
  );
}
