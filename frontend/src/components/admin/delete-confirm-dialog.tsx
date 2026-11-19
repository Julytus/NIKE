"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

interface DeleteConfirmDialogProps {
  open: boolean;
  itemId: number | null;
  itemName?: string;
  itemType?: string;
  extraDescription?: string;
  onConfirm: (id: number) => void;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
}

export function DeleteConfirmDialog({
  open,
  itemId,
  itemName,
  itemType = "item",
  extraDescription,
  onConfirm,
  onOpenChange,
  isLoading = false
}: DeleteConfirmDialogProps) {
  const handleConfirm = () => {
    if (itemId) {
      onConfirm(itemId);
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {itemType}</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <span className="font-semibold text-foreground">{itemName || `this ${itemType}`}</span>?
            This action can&apos;t be undone.
            {extraDescription && <span className="block mt-1">{extraDescription}</span>}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isLoading ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
