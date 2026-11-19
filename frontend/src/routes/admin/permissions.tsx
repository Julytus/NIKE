import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";

import { AdminListError } from "@/components/admin/admin-list-error";
import { AdminPermissionGuard } from "@/components/admin/admin-permission-guard";
import { PermissionMatrix } from "@/components/admin/permission/permission-matrix";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCanView } from "@/hooks/use-can-view";
import { allModulesQueryOptions } from "@/lib/tanstack/options/module";
import {
  createRolePermissionsQueryOptions,
  updatePermissionsMutationOptions
} from "@/lib/tanstack/options/permission";
import { allRolesQueryOptions } from "@/lib/tanstack/options/role";
import type { PermissionUpdateItem, ResourceInfoDTO } from "@/lib/types/permission";

const RESOURCE_CODE = "PERMISSION";

/** `?roleId=` để mở thẳng từ trang Chức vụ; giá trị sai thì bỏ qua. */
const searchSchema = z.object({
  roleId: z.coerce.number().int().positive().optional().catch(undefined)
});

export const Route = createFileRoute("/admin/permissions")({
  head: () => ({ meta: [{ title: "Permissions | Nike Admin" }] }),
  validateSearch: searchSchema,
  component: PermissionRoute
});

function PermissionRoute() {
  return (
    <AdminPermissionGuard code={RESOURCE_CODE}>
      <PermissionPage />
    </AdminPermissionGuard>
  );
}

function PermissionPage() {
  const { roleId: searchRoleId } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { can } = useCanView();
  const canUpdate = can(RESOURCE_CODE, "UPDATE");

  const rolesQuery = useQuery({ ...allRolesQueryOptions, enabled: can("ROLE", "VIEW") });
  const roles = rolesQuery.data?.items ?? [];
  // Không có quyền MODULE thì mọi tài nguyên vào nhóm "Chưa phân module"
  const modulesQuery = useQuery({ ...allModulesQueryOptions, enabled: can("MODULE", "VIEW") });
  const modules = modulesQuery.data?.items ?? [];

  // Chưa chọn: mặc định chức vụ không toàn quyền đầu tiên
  const fallbackRole = roles.find((r) => r.isOperator !== 1) ?? roles[0];
  const roleId = searchRoleId ?? fallbackRole?.id ?? 0;
  const role = roles.find((r) => r.id === roleId);

  useEffect(() => {
    if (!searchRoleId && fallbackRole) {
      void navigate({ search: { roleId: fallbackRole.id }, replace: true });
    }
  }, [searchRoleId, fallbackRole, navigate]);

  const queryClient = useQueryClient();
  const permissionsOptions = createRolePermissionsQueryOptions(roleId);
  const permissionsQuery = useQuery(permissionsOptions);
  const resources = permissionsQuery.data ?? [];
  const mutation = useMutation(updatePermissionsMutationOptions);

  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(() => new Set());

  const toggleModule = (key: string) =>
    setCollapsedModules((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const findResource = (id: number): ResourceInfoDTO | undefined =>
    resources.find((r) => r.id === id);

  const save = (items: PermissionUpdateItem[]) => {
    if (items.length === 0) return;
    // Ô tick đổi ngay; meta.invalidatesQuery tải lại từ server khi xong (lỗi thì về đúng trạng thái cũ)
    queryClient.setQueryData(permissionsOptions.queryKey, (old) =>
      old?.map((resource) => {
        const item = items.find((i) => i.resourceId === resource.id);
        return item ? { ...resource, permission: { actions: item.actions } } : resource;
      })
    );
    mutation.mutate(items);
  };

  const handleToggle = (resourceId: number, action: string, checked: boolean) => {
    const resource = findResource(resourceId);
    if (!resource) return;
    const granted = resource.permission.actions;
    const actions = checked
      ? [...granted.filter((a) => a !== action), action]
      : granted.filter((a) => a !== action);
    save([{ roleId, resourceId, actions }]);
  };

  const handleToggleMany = (
    items: { resourceId: number; actions: string[] }[],
    checked: boolean
  ) => {
    save(
      items.flatMap(({ resourceId, actions: changed }) => {
        const resource = findResource(resourceId);
        if (!resource) return [];
        const granted = resource.permission.actions;
        const actions = checked
          ? [...granted, ...changed.filter((a) => !granted.includes(a))]
          : granted.filter((a) => !changed.includes(a));
        return [{ roleId, resourceId, actions }];
      })
    );
  };

  const isOperator = role?.isOperator === 1;

  return (
    <div className="container mx-auto flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Permissions</h1>
          <p className="text-muted-foreground text-sm">
            Pick a role, then tick the actions allowed on each resource. Changes save instantly.
          </p>
        </div>
        <div className="grid w-full max-w-xs gap-2">
          <Label htmlFor="permission-role">Role</Label>
          <Select
            value={roleId > 0 ? String(roleId) : undefined}
            onValueChange={(value) => void navigate({ search: { roleId: Number(value) } })}
            disabled={roles.length === 0}
          >
            <SelectTrigger id="permission-role" className="w-full">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {r.name}
                  {r.isOperator === 1 ? " (full access)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isOperator && (
        <Alert>
          <ShieldCheck />
          <AlertTitle>Full-access role</AlertTitle>
          <AlertDescription>
            “{role?.name}” bypasses the permission table: every resource is allowed. Turn off full access on the
            Roles page to set detailed permissions.
          </AlertDescription>
        </Alert>
      )}

      {!canUpdate && !isOperator && (
        <Alert>
          <AlertTitle>Read only</AlertTitle>
          <AlertDescription>You don&apos;t have permission to update permissions.</AlertDescription>
        </Alert>
      )}

      {permissionsQuery.isError ? (
        <AdminListError
          title="Couldn't load permissions"
          onRetry={() => void permissionsQuery.refetch()}
        />
      ) : roleId === 0 && !rolesQuery.isLoading ? (
        <p className="text-muted-foreground text-sm">
          No roles to assign permissions to (or you can&apos;t view the Roles page).
        </p>
      ) : roleId === 0 || permissionsQuery.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <PermissionMatrix
          resources={resources}
          modules={modules}
          collapsedModules={collapsedModules}
          isMutating={mutation.isPending || permissionsQuery.isFetching || !canUpdate || isOperator}
          onToggleModule={toggleModule}
          onToggle={handleToggle}
          onToggleMany={handleToggleMany}
        />
      )}
    </div>
  );
}
