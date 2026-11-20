import * as React from "react";
import { z } from "zod";

import { FieldError } from "@/components/ui/field";
import { FormDialog } from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ModuleDTO, ModuleUpsertApiRequest } from "@/lib/types/module";
import { toFieldErrors } from "@/lib/utils/form-errors";

// Giới hạn theo cột bảng `module` (V1__baseline.sql). Backend không kiểm định dạng.
const moduleSchema = z.object({
  name: z.string().trim().min(1, "Please enter a module name").max(300, "Module name must be at most 300 characters"),
  code: z
    .string()
    .trim()
    .min(1, "Please enter a code")
    .max(100, "Code must be at most 100 characters")
    .regex(/^[A-Z0-9_]+$/, "Code may only contain uppercase letters, digits and _"),
  description: z.string().trim().max(300, "Description must be at most 300 characters")
});

export function ModuleFormDialog({
  open,
  module,
  isLoading,
  onOpenChange,
  onSubmit
}: {
  open: boolean;
  module: ModuleDTO | null;
  isLoading?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ModuleUpsertApiRequest) => void;
}) {
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [active, setActive] = React.useState(true);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    setName(module?.name ?? "");
    setCode(module?.code ?? "");
    setDescription(module?.description ?? "");
    setActive(module?.active !== 0);
    setErrors({});
  }, [module, open]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = moduleSchema.safeParse({ name, code, description });
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    onSubmit({
      id: module?.id,
      ...parsed.data,
      description: parsed.data.description || null,
      active: active ? 1 : 0
    });
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={module ? "Edit Module" : "Create Module"}
      featured={module ? "Update module details" : "Create a new module to group resources"}
      onSubmit={handleSubmit}
      submitLabel={module ? "Update" : "Create"}
      isLoading={isLoading}
    >
      <div className="space-y-2">
        <Label htmlFor="module-name">Module name</Label>
        <Input
          id="module-name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={!!errors.name}
        />
        <FieldError>{errors.name}</FieldError>
      </div>
      <div className="space-y-2">
        <Label htmlFor="module-code">Code</Label>
        <Input
          id="module-code"
          name="code"
          value={code}
          placeholder="e.g. SYSTEM"
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          aria-invalid={!!errors.code}
        />
        <FieldError>{errors.code}</FieldError>
      </div>
      <div className="space-y-2">
        <Label htmlFor="module-description">Description</Label>
        <Textarea
          id="module-description"
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="min-h-[80px]"
          aria-invalid={!!errors.description}
        />
        <FieldError>{errors.description}</FieldError>
      </div>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <Label htmlFor="module-active">Active</Label>
        <Switch id="module-active" checked={active} onCheckedChange={setActive} />
      </div>
    </FormDialog>
  );
}
