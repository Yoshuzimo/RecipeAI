
"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "./ui/button";

export function CheckExpiredDialog({
  isOpen,
  onClose,
  onConfirm,
  ingredientName,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (isGood: boolean) => void;
  ingredientName: string;
}) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Is this item still good?</AlertDialogTitle>
          <AlertDialogDescription>
            Your <span className="font-semibold text-foreground">{ingredientName}</span> is past its expiration date. Please check if it's still safe to eat before using.
            If you're unsure, it's best to remove the spoiled items from your inventory.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onConfirm(true)}>It's Still Good</AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirm(false)}>It's Spoiled (Manage Items)</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}