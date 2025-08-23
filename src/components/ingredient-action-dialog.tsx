
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { Biohazard, Wand2 } from "lucide-react";

export function IngredientActionDialog({
  isOpen,
  onClose,
  onSelectAction,
  ingredientName,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (action: 'substitute' | 'spoilage') => void;
  ingredientName: string;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Action for {ingredientName}</DialogTitle>
          <DialogDescription>
            What would you like to do with this ingredient?
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => onSelectAction('substitute')}
            >
                <Wand2 className="h-6 w-6" />
                <span>Get AI Substitutions</span>
            </Button>
            <Button
                variant="outline"
                className="h-20 flex-col gap-2 text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onSelectAction('spoilage')}
            >
                <Biohazard className="h-6 w-6" />
                <span>Report Spoilage</span>
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
