"use client";

import { useState } from "react";
import type { InventoryItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { AddInventoryItemDialog } from "@/components/add-inventory-item-dialog";
import { InventoryTable } from "@/components/inventory-table";

export default function InventoryClient({
  initialData,
}: {
  initialData: InventoryItem[];
}) {
  const [inventory, setInventory] = useState<InventoryItem[]>(initialData);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleItemAdded = (newItem: InventoryItem) => {
    setInventory((prev) => [...prev, newItem].sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime()));
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
          <Button onClick={() => setIsDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      <InventoryTable data={inventory} />

      <AddInventoryItemDialog
        isOpen={isDialogOpen}
        setIsOpen={setIsDialogOpen}
        onItemAdded={handleItemAdded}
      />
    </>
  );
}
