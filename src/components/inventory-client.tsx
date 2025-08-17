"use client";

import { useState } from "react";
import type { InventoryItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { AddInventoryItemDialog } from "@/components/add-inventory-item-dialog";
import { InventoryTable } from "@/components/inventory-table";
import { EditInventoryItemDialog } from "./edit-inventory-item-dialog";

export default function InventoryClient({
  initialData,
}: {
  initialData: InventoryItem[];
}) {
  const [inventory, setInventory] = useState<InventoryItem[]>(initialData);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const handleItemAdded = (newItem: InventoryItem) => {
    setInventory((prev) => [...prev, newItem].sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime()));
  };

  const handleItemUpdated = (updatedItem: InventoryItem) => {
    setInventory((prev) => 
      prev.map(item => item.id === updatedItem.id ? updatedItem : item)
         .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime())
    );
  };
  
  const handleItemRemoved = (itemId: string) => {
    setInventory((prev) => prev.filter(item => item.id !== itemId));
  }

  const handleRowClick = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsEditDialogOpen(true);
  };

  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">
            Manage your kitchen ingredients and leftovers.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      <InventoryTable data={inventory} onRowClick={handleRowClick} />

      <AddInventoryItemDialog
        isOpen={isAddDialogOpen}
        setIsOpen={setIsAddDialogOpen}
        onItemAdded={handleItemAdded}
      />

      {selectedItem && (
        <EditInventoryItemDialog
          isOpen={isEditDialogOpen}
          setIsOpen={setIsEditDialogOpen}
          item={selectedItem}
          onItemUpdated={handleItemUpdated}
          onItemRemoved={handleItemRemoved}
        />
      )}
    </>
  );
}
