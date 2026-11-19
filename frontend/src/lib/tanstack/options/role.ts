import { keepPreviousData, queryOptions, type MutationOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { deleteRole, getRoleList, upsertRole } from "@/lib/axios/role";
import type { ErrorResponse } from "@/lib/types/common";
import type { RoleDTO, RoleListApiRequest, RoleUpsertApiRequest } from "@/lib/types/role";

export const ROLES_QUERY_KEY = ["roles"] as const;

export const createRoleListQueryOptions = (req: RoleListApiRequest) =>
  queryOptions({
    queryKey: [...ROLES_QUERY_KEY, "list", req],
    queryFn: () => getRoleList(req),
    placeholderData: keepPreviousData
  });

/** Mọi chức vụ (tối đa 200) cho ô chọn ở trang phân quyền. */
export const allRolesQueryOptions = queryOptions({
  queryKey: [...ROLES_QUERY_KEY, "all"],
  queryFn: () => getRoleList({ paging: { page: 1, limit: 200 } }),
  staleTime: 60_000
});

export const createUpsertRoleMutationOptions = (
  isEdit: boolean
): MutationOptions<RoleDTO, AxiosError<ErrorResponse>, RoleUpsertApiRequest> => ({
  mutationKey: [...ROLES_QUERY_KEY, "upsert"],
  mutationFn: upsertRole,
  meta: {
    // Đổi cờ toàn quyền của chức vụ mình đang giữ thì menu / nút cũng phải đổi theo
    invalidatesQuery: [ROLES_QUERY_KEY, ["me"], ["permission-resource"]],
    successMessage: isEdit ? "Role updated" : "Role created",
    errorMessage: "Couldn't save role"
  }
});

export const deleteRoleMutationOptions: MutationOptions<number, AxiosError<ErrorResponse>, number> = {
  mutationKey: [...ROLES_QUERY_KEY, "delete"],
  mutationFn: deleteRole,
  meta: {
    invalidatesQuery: [ROLES_QUERY_KEY],
    successMessage: "Role deleted",
    errorMessage: "Couldn't delete role"
  }
};
