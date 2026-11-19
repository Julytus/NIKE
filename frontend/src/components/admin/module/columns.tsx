import { type ColumnDef } from "@tanstack/react-table";
import { MoreVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import type { ModuleDTO } from "@/lib/types/module";

export const createModuleColumns = ({
  canUpdate,
  canDelete,
  onEdit,
  onShowDeleteConfirm,
  onToggleActive,
  onAssign
}: {
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (module: ModuleDTO) => void;
  onShowDeleteConfirm: (id: number, name?: string) => void;
  onToggleActive: (module: ModuleDTO, active: boolean) => void;
  onAssign: (module: ModuleDTO) => void;
}): ColumnDef<ModuleDTO>[] => [
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
        } satisfies ColumnDef<ModuleDTO>
      ]
    : []),
  {
    accessorKey: "name",
    header: "Module name",
    cell: ({ row }) => (
      <span className="text-foreground font-bold tracking-tight">{row.original.name}</span>
    ),
    enableHiding: false
  },
  { accessorKey: "code", header: "Code" },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.description || "—"}</span>
    )
  },
  {
    accessorKey: "active",
    header: "Active",
    cell: ({ row }) => (
      <Switch
        checked={row.original.active === 1}
        disabled={!canUpdate}
        onCheckedChange={(checked) => onToggleActive(row.original, checked)}
        aria-label={`Toggle module ${row.original.name}`}
      />
    )
  },
  {
    id: "rowActions",
    header: () => <span className="sr-only">Actions</span>,
    enableHiding: false,
    cell: ({ row }) =>
      canUpdate || canDelete ? (
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
            <DropdownMenuContent align="end" className="w-40">
              {canUpdate && (
                <>
                  <DropdownMenuItem onClick={() => onEdit(row.original)}>Edit</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAssign(row.original)}>
                    Assign Resources
                  </DropdownMenuItem>
                </>
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
