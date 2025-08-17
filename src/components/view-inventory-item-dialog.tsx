
"use client";

import { useState, useMemo } from "react";
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
import { Button } from "./ui/button";
import { PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addInventoryItem } from "@/lib/data";
import { addDays } from "date-fns";
import { AddPackageForm } from "./add-package-form";


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
  const { toast } = useToast();
  const [isAddingNewSize, setIsAddingNewSize] = useState(false);
  
  const groupedByPackageSize = useMemo(() => {
    return group.items.reduce((acc, item) => {
      const key = item.originalQuantity.toString();
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {} as Record<string, InventoryItem[]>);
  }, [group.items]);

  const handleAddAnother = async (packageSize: number) => {
    try {
      const firstItem = group.items[0];
      const newItem = await addInventoryItem({
        name: group.name,
        totalQuantity: packageSize,
        originalQuantity: packageSize,
        unit: group.unit,
        // Assume default expiry and location for quick add
        expiryDate: addDays(new Date(), 7), 
        locationId: firstItem.locationId,
      });
      onItemUpdated(newItem); // This will trigger a refresh in the parent
      toast({
        title: "Package Added",
        description: `Added another ${packageSize}${group.unit} package of ${group.name}.`,
      });
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add package.",
      });
    }
  }
  
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
            <div className="space-y-6">
                {Object.entries(groupedByPackageSize).map(([size, items]) => (
                    <div key={size} className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="font-semibold text-lg">{`${items.length} x ${size}${group.unit} Packages`}</h4>
                            <Button size="sm" variant="outline" onClick={() => handleAddAnother(Number(size))}>
                                <PlusCircle className="mr-2 h-4 w-4"/>
                                Add Another
                            </Button>
                        </div>
                        <div className="space-y-2">
                        {items.map(item => (
                            <EditInventoryItemDialog 
                                key={item.id}
                                item={item}
                                onItemUpdated={onItemUpdated}
                                onItemRemoved={onItemRemoved}
                            />
                        ))}
                        </div>
                    </div>
                ))}

                <Separator />

                {isAddingNewSize ? (
                    <AddPackageForm 
                        itemName={group.name}
                        unit={group.unit}
                        onPackageAdded={(newItem) => {
                            onItemUpdated(newItem);
                            setIsAddingNewSize(false);
                        }}
                        onCancel={() => setIsAddingNewSize(false)}
                    />
                ) : (
                    <Button variant="secondary" className="w-full" onClick={() => setIsAddingNewSize(true)}>
                        <PlusCircle className="mr-2 h-4 w-4"/>
                        Add New Package Size
                    </Button>
                )}
            </div>
         </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
