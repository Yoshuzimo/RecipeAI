
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { InventoryItem, InventoryItemGroup } from "@/lib/types";
import { ScrollArea } from "./ui/scroll-area";
import { EditInventoryItemDialog } from "./edit-inventory-item-dialog";
import { Separator } from "./ui/separator";

export function ViewInventoryItemDialog({
  isOpen,
  setIsOpen,
  group,
  onItemUpdated,
  onItemRemoved,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  group: InventoryItemGroup;
  onItemUpdated: (item: InventoryItem) => void;
  onItemRemoved: (itemId: string) => void;
}) {
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>View {group.name} Packages</DialogTitle>
          <DialogDescription>
            View and manage individual packages of {group.name}.
          </DialogDescription>
        </DialogHeader>
        <Separator />
         <ScrollArea className="h-96 pr-6">
            <div className="space-y-4">
            {group.items.map(item => (
                <EditInventoryItemDialog 
                    key={item.id}
                    item={item}
                    onItemUpdated={(updatedItem) => {
                        onItemUpdated(updatedItem);
                    }}
                    onItemRemoved={onItemRemoved}
                />
            ))}
            </div>
         </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
