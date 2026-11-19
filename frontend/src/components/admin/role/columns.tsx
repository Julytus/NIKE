import { type ColumnDef } from "@tanstack/react-table";
import { MoreVertical } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import type { RoleDTO } from "@/lib/types/role";

export const createRoleColumns = ({
  canPermission,
  canUpdate,
  canDelete,
  onPermission,
  onEdit,
  onShowDeleteConfirm
}: {
  canPermission: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onPermission: (role: RoleDTO) => void;
  onEdit: (role: RoleDTO) => void;
  onShowDeleteConfirm: (id: number, name?: string) => void;
}): ColumnDef<RoleDTO>[] => [
  ...(canDelete
    ? [
        {
          id: "select",
          header: ({ table }) => (
            <div className="flex items-center justify-center">
              <Checkbox
                checked={
                  table.getIsAllPageRowsSelected() ||
                  (table.getIsSomePageRowsSelected() && "indeterminate")
                }
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
              />
            </div>
          ),
          cell: ({ row }) => (
            <div className="flex items-center justify-center">
              <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label={`Select ${row.original.name}`}
              />
            </div>
          ),
          enableSorting: false,
          enableHiding: false
        } satisfies ColumnDef<RoleDTO>
      ]
    : []),
  {
    accessorKey: "name",
    header: "Role",
    cell: ({ row }) => (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-foreground font-bold tracking-tight">{row.original.name}</span>
        {row.original.isDefault === 1 && <Badge variant="secondary">Default</Badge>}
        {row.original.isOperator === 1 && <Badge variant="default">Full Access</Badge>}
      </div>
    ),
    enableHiding: false
  },
  {
    id: "rowActions",
    header: () => <span className="sr-only">Actions</span>,
    enableHiding: false,
    cell: ({ row }) =>
      canPermission || canUpdate || canDelete ? (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="text-muted-foreground data-[state=open]:bg-muted flex size-8"
                size="icon"
                aria-label={`Actions ${row.original.name}`}
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {canPermission && (
                <DropdownMenuItem onClick={() => onPermission(row.original)}>
                  Permissions
                </DropdownMenuItem>
              )}
              {canUpdate && (
                <DropdownMenuItem onClick={() => onEdit(row.original)}>Edit</DropdownMenuItem>
              )}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onShowDeleteConfirm(row.original.id, row.original.name)}
                  >
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null
  }
];
