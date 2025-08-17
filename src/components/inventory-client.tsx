"use client";

import { useState, useMemo } from "react";
import type { InventoryItem, InventoryItemGroup } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { AddInventoryItemDialog } from "@/components/add-inventory-item-dialog";
import { InventoryTable } from "@/components/inventory-table";
import { ViewInventoryItemDialog } from "./view-inventory-item-dialog";

export default function InventoryClient({
  initialData,
  allItems
}: {
  initialData: InventoryItemGroup[];
  allItems: InventoryItem[];
}) {
  const [inventoryGroups, setInventoryGroups] = useState<InventoryItemGroup[]>(initialData);
  const [flatInventory, setFlatInventory] = useState<InventoryItem[]>(allItems);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<InventoryItemGroup | null>(null);

  const updateState = (newFlatInventory: InventoryItem[]) => {
      const grouped = newFlatInventory.reduce<InventoryItemGroup[]>((acc, item) => {
        let group = acc.find(g => g.name === item.name && g.unit === item.unit);
        if (!group) {
          group = { name: item.name, items: [], totalQuantity: 0, unit: item.unit, nextExpiry: null };
          acc.push(group);
        }
        group.items.push(item);
        group.totalQuantity += (item.packageSize * item.packageCount);
        const sortedItems = group.items.sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());
        group.items = sortedItems;
        group.nextExpiry = sortedItems[0]?.expiryDate ?? null;
        return acc;
      }, []);

      const sortedGrouped = grouped.sort((a,b) => {
        if (!a.nextExpiry) return 1;
        if (!b.nextExpiry) return -1;
        return a.nextExpiry.getTime() - b.nextExpiry.getTime();
      });

      setFlatInventory(newFlatInventory);
      setInventoryGroups(sortedGrouped);

      // If a group is being viewed, update its state as well
      if (selectedGroup) {
        const updatedGroup = sortedGrouped.find(g => g.name === selectedGroup.name);
        if (updatedGroup) {
            setSelectedGroup(updatedGroup);
        } else {
            // The group was deleted (e.g. last item removed)
            setIsViewDialogOpen(false);
            setSelectedGroup(null);
        }
      }
  }


  const handleItemAdded = (newItem: InventoryItem) => {
    updateState([...flatInventory, newItem]);
  };

  const handleItemUpdated = (updatedItem: InventoryItem) => {
    const newFlatInventory = flatInventory.map(item => item.id === updatedItem.id ? updatedItem : item);
    updateState(newFlatInventory);
  };
  
  const handleItemRemoved = (itemId: string) => {
    const newFlatInventory = flatInventory.filter(item => item.id !== itemId);
    updateState(newFlatInventory);
  }

  const handleRowClick = (group: InventoryItemGroup) => {
    setSelectedGroup(group);
    setIsViewDialogOpen(true);
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

      <InventoryTable data={inventoryGroups} onRowClick={handleRowClick} />

      <AddInventoryItemDialog
        isOpen={isAddDialogOpen}
        setIsOpen={setIsAddDialogOpen}
        onItemAdded={handleItemAdded}
      />

      {selectedGroup && (
        <ViewInventoryItemDialog
          isOpen={isViewDialogOpen}
          setIsOpen={setIsViewDialogOpen}
          group={selectedGroup}
          onItemUpdated={handleItemUpdated}
          onItemRemoved={handleItemRemoved}
        />
      )}
    </>
  );
}
