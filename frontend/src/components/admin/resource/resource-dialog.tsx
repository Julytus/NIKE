import * as React from "react";
import { z } from "zod";

import { Checkbox } from "@/components/ui/checkbox";
import { FieldError } from "@/components/ui/field";
import { FormDialog } from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  RESOURCE_ACTIONS,
  SYSTEM_RESOURCE_CODES,
  type ResourceDTO,
  type ResourceUpsertApiRequest
} from "@/lib/types/resource";
import { toFieldErrors } from "@/lib/utils/form-errors";

// Giới hạn theo cột bảng `resource`. `uri` phải trùng hằng URI của controller ("/product/").
const resourceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Please enter a resource name")
    .max(300, "Resource name must be at most 300 characters"),
  description: z.string().trim().max(300, "Description must be at most 300 characters"),
  code: z
    .string()
    .trim()
    .min(1, "Please enter a code")
    .max(100, "Code must be at most 100 characters")
    .regex(/^[A-Z0-9_]+$/, "Code may only contain uppercase letters, digits and _"),
  uri: z
    .string()
    .trim()
    .min(1, "Please enter a URI")
    .max(300, "URI must be at most 300 characters")
    .regex(/^\/[a-z0-9-]+\/$/, "URI must look like /resource-name/ (lowercase letters, digits, -)"),
  actions: z.array(z.enum(RESOURCE_ACTIONS)).min(1, "Select at least one action")
});

export function ResourceFormDialog({
  open,
  resource,
  isLoading,
  onOpenChange,
  onSubmit
}: {
  open: boolean;
  resource: ResourceDTO | null;
  isLoading?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ResourceUpsertApiRequest) => void;
}) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [code, setCode] = React.useState("");
  const [uri, setUri] = React.useState("");
  const [actions, setActions] = React.useState<string[]>([]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    setName(resource?.name ?? "");
    setDescription(resource?.description ?? "");
    setCode(resource?.code ?? "");
    setUri(resource?.uri ?? "");
    setActions(resource?.actions ?? ["VIEW"]);
    setErrors({});
  }, [resource, open]);

  const isSystemResource = !!resource && SYSTEM_RESOURCE_CODES.includes(resource.code);

  const toggleAction = (action: string, checked: boolean) => {
    setActions((prev) => (checked ? [...prev, action] : prev.filter((a) => a !== action)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Giữ thứ tự VIEW, ADD, UPDATE, DELETE; action lạ (cấp từ migration) không sửa ở đây
    const ordered = RESOURCE_ACTIONS.filter((a) => actions.includes(a));
    const parsed = resourceSchema.safeParse({ name, description, code, uri, actions: ordered });
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    const extra = (resource?.actions ?? []).filter(
      (a) => !(RESOURCE_ACTIONS as readonly string[]).includes(a)
    );
    onSubmit({
      id: resource?.id,
      ...parsed.data,
      description: parsed.data.description || null,
      actions: [...parsed.data.actions, ...extra],
      active: resource?.active ?? 1
    });
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={resource ? "Edit Resource" : "Create Resource"}
      featured={
        resource
          ? "Update system resource details"
          : "Create a new resource to grant to roles"
      }
      onSubmit={handleSubmit}
      submitLabel={resource ? "Update" : "Create"}
      isLoading={isLoading}
    >
      <div className="space-y-2">
        <Label htmlFor="resource-name">Resource name</Label>
        <Input
          id="resource-name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={!!errors.name}
        />
        <FieldError>{errors.name}</FieldError>
      </div>

      <div className="space-y-2">
        <Label htmlFor="resource-description">Description</Label>
        <Textarea
          id="resource-description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[80px]"
          aria-invalid={!!errors.description}
        />
        <FieldError>{errors.description}</FieldError>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="resource-code">Code</Label>
          <Input
            id="resource-code"
            name="code"
            value={code}
            placeholder="e.g. PRODUCT"
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            disabled={isSystemResource}
            aria-invalid={!!errors.code}
          />
          <FieldError>{errors.code}</FieldError>
        </div>
        <div className="space-y-2">
          <Label htmlFor="resource-uri">URI</Label>
          <Input
            id="resource-uri"
            name="uri"
            value={uri}
            placeholder="e.g. /product/"
            onChange={(e) => setUri(e.target.value)}
            disabled={isSystemResource}
            aria-invalid={!!errors.uri}
          />
          <FieldError>{errors.uri}</FieldError>
        </div>
      </div>
      {isSystemResource && (
        <p className="text-muted-foreground text-xs">
          This is a system resource — Code/URI can&apos;t be changed because permissions match on this URI.
        </p>
      )}

      <div className="space-y-2">
        <Label>Supported Actions</Label>
        <div className="flex flex-wrap gap-4">
          {RESOURCE_ACTIONS.map((action) => (
            <label key={action} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={actions.includes(action)}
                onCheckedChange={(checked) => toggleAction(action, checked === true)}
                aria-label={`Action ${action}`}
              />
              {action}
            </label>
          ))}
        </div>
        <FieldError>{errors.actions}</FieldError>
      </div>
    </FormDialog>
  );
}
