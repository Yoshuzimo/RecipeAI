

"use client";

import { useState } from "react";
import type { InventoryItem, InventoryItemGroup, GroupedByLocation, StorageLocation, Unit } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PlusCircle, Refrigerator, Snowflake, Warehouse } from "lucide-react";
import { AddInventoryItemDialog } from "@/components/add-inventory-item-dialog";
import { InventoryTable } from "@/components/inventory-table";
import { ViewInventoryItemDialog } from "./view-inventory-item-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";

const locationIcons = {
  Fridge: <Refrigerator className="h-6 w-6" />,
  Freezer: <Snowflake className="h-6 w-6" />,
  Pantry: <Warehouse className="h-6 w-6" />,
};

export default function InventoryClient({
  initialData,
  allItems,
  storageLocations,
}: {
  initialData: GroupedByLocation;
  allItems: InventoryItem[];
  storageLocations: StorageLocation[];
}) {
  const [groupedInventory, setGroupedInventory] = useState<GroupedByLocation>(initialData);
  const [flatInventory, setFlatInventory] = useState<InventoryItem[]>(allItems);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<InventoryItemGroup | null>(null);

  const updateState = (newFlatInventory: InventoryItem[]) => {
      const groupItems = (items: InventoryItem[]): InventoryItemGroup[] => {
        // Group by item name, unit, and ownerId to separate private items
        const groupedByName = items.reduce<Record<string, { items: InventoryItem[], unit: Unit }>>((acc, item) => {
          const key = `${item.name}-${item.unit}-${item.ownerId || 'shared'}`;
          if (!acc[key]) {
            acc[key] = { items: [], unit: item.unit };
          }
          acc[key].items.push(item);
          return acc;
        }, {});

        // Now, map over the grouped items to create the final structure.
        const finalGroups = Object.entries(groupedByName).map(([key, groupData]) => {
          const { items, unit } = groupData;
          // If any item in the group has an owner, we use that name for display
          const representativeItem = items[0];
          const displayName = representativeItem.ownerName
            ? `${representativeItem.name} (${representativeItem.ownerName})`
            : representativeItem.name;


          let packageInfo = '';

          if (unit === 'pcs') {
              const totalPieces = items.reduce((sum, item) => sum + item.totalQuantity, 0);
              const packageSize = items[0]?.originalQuantity || 1; // Assume at least one item to get package size
              
              if (packageSize > 1) {
                const fullPackages = Math.floor(totalPieces / packageSize);
                const remainingPieces = totalPieces % packageSize;
                
                let parts = [];
                if (fullPackages > 0) {
                    parts.push(`${fullPackages} x ${packageSize}${unit}`);
                }
                if (remainingPieces > 0) {
                    parts.push(`${remainingPieces.toFixed(0)} ${unit}`);
                }
                packageInfo = parts.join(' + ');
              } else {
                 packageInfo = `${totalPieces.toFixed(0)} ${unit}`;
              }

          } else {
            // Original logic for non-'pcs' items
            const packageCounts = items.reduce<Record<string, { count: number, items: InventoryItem[] }>>((acc, item) => {
              const packageKey = item.originalQuantity.toString();
              if (!acc[packageKey]) {
                acc[packageKey] = { count: 0, items: [] };
              }
              acc[packageKey].count++;
              acc[packageKey].items.push(item);
              return acc;
            }, {});
            
            packageInfo = Object.entries(packageCounts).map(([size, data]) => {
                const fullPackages = data.items.filter(i => i.totalQuantity === i.originalQuantity).length;
                const partialPackages = data.items.filter(i => i.totalQuantity < i.originalQuantity);
                
                let infoParts = [];
                if (fullPackages > 0) {
                    infoParts.push(`${fullPackages} x ${size}${unit}`);
                }
                partialPackages.forEach(p => {
                    const percentage = ((p.totalQuantity / p.originalQuantity) * 100).toFixed(0);
                    infoParts.push(`1 x ${size}${unit} (${percentage}% full)`);
                });
                return infoParts.join(', ');
            }).join('; ');
          }


          const sortedItems = items.sort((a, b) => {
            if (a.expiryDate === null) return 1;
            if (b.expiryDate === null) return -1;
            return a.expiryDate.getTime() - b.expiryDate.getTime();
          });
          const nextExpiry = sortedItems.length > 0 ? sortedItems[0].expiryDate : null;

          return {
            name: displayName,
            unit,
            items: sortedItems,
            packageInfo,
            nextExpiry,
          };
        });

        return finalGroups.sort((a, b) => {
          if (a.nextExpiry === null) return 1;
          if (b.nextExpiry === null) return -1;
          return a.nextExpiry.getTime() - b.nextExpiry.getTime();
        });
      };

      const locationMap = new Map(storageLocations.map(loc => [loc.id, loc.type]));
      const newGroupedByLocation: GroupedByLocation = {
        Fridge: groupItems(newFlatInventory.filter(item => locationMap.get(item.locationId) === 'Fridge')),
        Freezer: groupItems(newFlatInventory.filter(item => locationMap.get(item.locationId) === 'Freezer')),
        Pantry: groupItems(newFlatInventory.filter(item => locationMap.get(item.locationId) === 'Pantry')),
      };

      setFlatInventory(newFlatInventory);
      setGroupedInventory(newGroupedByLocation);

      if (selectedGroup) {
        const allGroups = [...newGroupedByLocation.Fridge, ...newGroupedByLocation.Freezer, ...newGroupedByLocation.Pantry];
        const updatedGroup = allGroups.find(g => g.name === selectedGroup.name && g.unit === selectedGroup.unit);
        if (updatedGroup) {
            setSelectedGroup(updatedGroup);
        } else {
            setIsViewDialogOpen(false);
            setSelectedGroup(null);
        }
      }
  }


  const handleItemAdded = (newItem: InventoryItem) => {
    updateState([...flatInventory, newItem]);
  };
  
  const handleUpdateComplete = (newInventory: InventoryItem[]) => {
      updateState(newInventory);
  };


  const handleRowClick = (group: InventoryItemGroup) => {
    setSelectedGroup(group);
    setIsViewDialogOpen(true);
  };
  
  const locationOrder: Array<keyof GroupedByLocation> = ['Fridge', 'Freezer', 'Pantry'];

  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">
            Manage your kitchen ingredients and leftovers. (You can add or remove storage locations in Settings).
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>
      
      <Accordion type="multiple" defaultValue={['Fridge', 'Freezer', 'Pantry']} className="w-full space-y-4">
        {locationOrder.map(locationType => (
            <AccordionItem value={locationType} key={locationType} className="border-none">
                <Card>
                    <AccordionTrigger className="p-0 hover:no-underline">
                        <CardHeader className="flex-row items-center justify-between w-full p-4">
                           <div className="flex items-center gap-4">
                             {locationIcons[locationType]}
                            <CardTitle className="text-2xl">{locationType}</CardTitle>
                           </div>
                        </CardHeader>
                    </AccordionTrigger>
                    <AccordionContent className="px-2 sm:px-4 pb-4">
                        <InventoryTable data={groupedInventory[locationType]} onRowClick={handleRowClick} />
                    </AccordionContent>
                </Card>
            </AccordionItem>
        ))}
      </Accordion>


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
          onUpdateComplete={handleUpdateComplete}
        />
      )}
    </>
  );
}
