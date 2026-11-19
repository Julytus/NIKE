"use client";

import * as React from "react";
import { useInfiniteQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createInfiniteResourcesQueryOptions } from "@/lib/tanstack/options/resource";
import type { ModuleDTO } from "@/lib/types/module";

const PAGE_SIZE = 10;

interface AssignResourcesDialogProps {
  open: boolean;
  module: ModuleDTO | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (moduleId: number, resourceIds: number[]) => void;
}

export function AssignResourcesDialog({
  open,
  module,
  isPending,
  onOpenChange,
  onAssign
}: AssignResourcesDialogProps) {
  const [keyword, setKeyword] = React.useState("");
  const [debouncedKeyword, setDebouncedKeyword] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(() => new Set());

  React.useEffect(() => {
    setKeyword("");
    setDebouncedKeyword("");
    setSelectedIds(new Set());
  }, [open, module?.id]);

  React.useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedKeyword(keyword.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [keyword]);

  const resourcesQuery = useInfiniteQuery({
    ...createInfiniteResourcesQueryOptions({
      opts: {
        unassigned: true,
        keyword: debouncedKeyword || undefined,
        paging: { page: 1, limit: PAGE_SIZE }
      }
    }),
    enabled: open
  });

  const resources = React.useMemo(
    () => resourcesQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [resourcesQuery.data]
  );

  const toggleResource = (id: number, checked: boolean | "indeterminate") => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked === true) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setKeyword("");
      setDebouncedKeyword("");
      setSelectedIds(new Set());
    }
    onOpenChange(nextOpen);
  };

  const handleAssign = () => {
    if (module && selectedIds.size > 0 && !isPending) {
      onAssign(module.id, Array.from(selectedIds));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Resources</DialogTitle>
          <DialogDescription>
            Pick unassigned resources to add to {module?.name ?? "the module"}.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Search resources..."
          aria-label="Search resources"
        />
        <ScrollArea className="h-64 rounded-md border">
          <div className="p-3">
            {resourcesQuery.isLoading ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Loading resources...
              </p>
            ) : resourcesQuery.isError ? (
              <p className="text-destructive py-8 text-center text-sm">
                Couldn&apos;t load resources.
              </p>
            ) : resources.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                No unassigned resources.
              </p>
            ) : (
              <div className="space-y-1">
                {resources.map((resource) => (
                  <label
                    key={resource.id}
                    className="hover:bg-muted flex cursor-pointer items-center gap-3 rounded-md p-2"
                  >
                    <Checkbox
                      checked={selectedIds.has(resource.id)}
                      onCheckedChange={(checked) => toggleResource(resource.id, checked)}
                      aria-label={`Select ${resource.name}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{resource.name}</span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {resource.code}
                        {resource.uri ? ` · ${resource.uri}` : ""}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
            {resourcesQuery.hasNextPage && (
              <Button
                type="button"
                variant="ghost"
                className="mt-2 w-full"
                disabled={resourcesQuery.isFetchingNextPage}
                onClick={() => void resourcesQuery.fetchNextPage()}
              >
                {resourcesQuery.isFetchingNextPage ? "Loading..." : "Load More"}
              </Button>
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={selectedIds.size === 0 || isPending}
            onClick={handleAssign}
          >
            {isPending ? "Assigning..." : `Assign${selectedIds.size ? ` (${selectedIds.size})` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
