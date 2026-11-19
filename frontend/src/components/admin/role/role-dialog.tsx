import * as React from "react";
import { z } from "zod";

import { FieldError } from "@/components/ui/field";
import { FormDialog } from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { RoleDTO, RoleUpsertApiRequest } from "@/lib/types/role";
import { toFieldErrors } from "@/lib/utils/form-errors";

// `role.name` varchar(50) NOT NULL, UNIQUE (trùng tên do backend báo).
const roleSchema = z.object({
  name: z.string().trim().min(1, "Please enter a role name").max(50, "Role name must be at most 50 characters")
});

export function RoleFormDialog({
  open,
  role,
  isLoading,
  onOpenChange,
  onSubmit
}: {
  open: boolean;
  role: RoleDTO | null;
  isLoading?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: RoleUpsertApiRequest) => void;
}) {
  const [name, setName] = React.useState("");
  const [isDefault, setIsDefault] = React.useState(false);
  const [isOperator, setIsOperator] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    setName(role?.name ?? "");
    setIsDefault(role?.isDefault === 1);
    setIsOperator(role?.isOperator === 1);
    setErrors({});
  }, [role, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = roleSchema.safeParse({ name });
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    onSubmit({
      id: role?.id,
      name: parsed.data.name,
      isDefault: isDefault ? 1 : 0,
      isOperator: isOperator ? 1 : 0
    });
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={role ? "Edit Role" : "Create Role"}
      featured={
        role ? "Update role details" : "Create a new role to grant permissions to users"
      }
      onSubmit={handleSubmit}
      submitLabel={role ? "Update" : "Create"}
      isLoading={isLoading}
    >
      <div className="space-y-2">
        <Label htmlFor="role-name">Role name</Label>
        <Input
          id="role-name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={!!errors.name}
        />
        <FieldError>{errors.name}</FieldError>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="space-y-0.5">
          <Label htmlFor="role-is-default">Default role</Label>
          <p className="text-muted-foreground text-xs">
            Automatically assigned to newly registered accounts (only one role can be default)
          </p>
        </div>
        <Switch id="role-is-default" checked={isDefault} onCheckedChange={setIsDefault} />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="space-y-0.5">
          <Label htmlFor="role-is-operator">Full access (Operator)</Label>
          <p className="text-muted-foreground text-xs">
            Skips resource permission checks — enable only for the top admin role
          </p>
        </div>
        <Switch id="role-is-operator" checked={isOperator} onCheckedChange={setIsOperator} />
      </div>
    </FormDialog>
  );
}
