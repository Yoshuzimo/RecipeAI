

"use client";

import { useState } from "react";
import type { InventoryItem, InventoryItemGroup, GroupedByLocation, StorageLocation, Unit } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PlusCircle, Refrigerator, Snowflake, Warehouse, User, Users, Lock } from "lucide-react";
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

const locationOrder: Array<keyof GroupedByLocation> = ['Fridge', 'Freezer', 'Pantry'];


const InventoryColumn = ({ title, icon, groupedData, onRowClick }: { title: string, icon: React.ReactNode, groupedData: GroupedByLocation, onRowClick: (group: InventoryItemGroup, isPrivate: boolean) => void }) => {
    const isPrivate = title === "Private Inventory";
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-2xl font-bold">
                {icon}
                <h2>{title}</h2>
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
                               <InventoryTable data={groupedData[locationType]} onRowClick={(group) => onRowClick(group, isPrivate)} />
                            </AccordionContent>
                        </Card>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    );
};


export default function InventoryClient({
  initialPrivateData,
  initialSharedData,
  initialAllPrivateItems,
  initialAllSharedItems,
  storageLocations,
}: {
  initialPrivateData: GroupedByLocation;
  initialSharedData: GroupedByLocation;
  initialAllPrivateItems: InventoryItem[];
  initialAllSharedItems: InventoryItem[];
  storageLocations: StorageLocation[];
}) {
  const [groupedPrivate, setGroupedPrivate] = useState<GroupedByLocation>(initialPrivateData);
  const [groupedShared, setGroupedShared] = useState<GroupedByLocation>(initialSharedData);
  const [allPrivateItems, setAllPrivateItems] = useState<InventoryItem[]>(initialAllPrivateItems);
  const [allSharedItems, setAllSharedItems] = useState<InventoryItem[]>(initialAllSharedItems);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<{group: InventoryItemGroup, isPrivate: boolean} | null>(null);

  const updateState = (newPrivateItems: InventoryItem[], newSharedItems: InventoryItem[]) => {
      const groupItems = (items: InventoryItem[]): InventoryItemGroup[] => {
        const groupedByName = items.reduce<Record<string, { items: InventoryItem[], unit: Unit }>>((acc, item) => {
          const key = `${item.name}-${item.unit}`;
          if (!acc[key]) {
            acc[key] = { items: [], unit: item.unit };
          }
          acc[key].items.push(item);
          return acc;
        }, {});

        const finalGroups = Object.entries(groupedByName).map(([key, groupData]) => {
          const { items, unit } = groupData;
          const name = items[0].name;

          let packageInfo = '';

          if (unit === 'pcs') {
              const totalPieces = items.reduce((sum, item) => sum + item.totalQuantity, 0);
              const packageSize = items[0]?.originalQuantity || 1;
              
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
            name,
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

      const newGroupedPrivate: GroupedByLocation = {
        Fridge: groupItems(newPrivateItems.filter(item => locationMap.get(item.locationId) === 'Fridge')),
        Freezer: groupItems(newPrivateItems.filter(item => locationMap.get(item.locationId) === 'Freezer')),
        Pantry: groupItems(newPrivateItems.filter(item => locationMap.get(item.locationId) === 'Pantry')),
      };

      const newGroupedShared: GroupedByLocation = {
        Fridge: groupItems(newSharedItems.filter(item => locationMap.get(item.locationId) === 'Fridge')),
        Freezer: groupItems(newSharedItems.filter(item => locationMap.get(item.locationId) === 'Freezer')),
        Pantry: groupItems(newSharedItems.filter(item => locationMap.get(item.locationId) === 'Pantry')),
      };

      setAllPrivateItems(newPrivateItems);
      setAllSharedItems(newSharedItems);
      setGroupedPrivate(newGroupedPrivate);
      setGroupedShared(newGroupedShared);

      if (selectedGroup) {
        const allGroups = selectedGroup.isPrivate ? 
            [...newGroupedPrivate.Fridge, ...newGroupedPrivate.Freezer, ...newGroupedPrivate.Pantry] :
            [...newGroupedShared.Fridge, ...newGroupedShared.Freezer, ...newGroupedShared.Pantry];
        
        const updatedGroup = allGroups.find(g => g.name === selectedGroup.group.name && g.unit === selectedGroup.group.unit);
        
        if (updatedGroup) {
            setSelectedGroup({ group: updatedGroup, isPrivate: selectedGroup.isPrivate });
        } else {
            setIsViewDialogOpen(false);
            setSelectedGroup(null);
        }
      }
  }


  const handleItemAdded = (newItem: InventoryItem, isPrivate: boolean) => {
    if (isPrivate) {
        updateState([...allPrivateItems, newItem], allSharedItems);
    } else {
        updateState(allPrivateItems, [...allSharedItems, newItem]);
    }
  };
  
  const handleUpdateComplete = (newPrivate: InventoryItem[], newShared: InventoryItem[]) => {
      updateState(newPrivate, newShared);
  };


  const handleRowClick = (group: InventoryItemGroup, isPrivate: boolean) => {
    setSelectedGroup({group, isPrivate});
    setIsViewDialogOpen(true);
  };
  
  const hasHousehold = allSharedItems.length > 0 || (initialAllSharedItems && initialAllSharedItems.length > 0) || (groupedShared.Fridge.length + groupedShared.Freezer.length + groupedShared.Pantry.length > 0) || (initialSharedData.Fridge.length + initialSharedData.Freezer.length + initialSharedData.Pantry.length > 0) ;


  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">
            Manage your kitchen ingredients and leftovers. Add or remove storage locations in Settings.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {hasHousehold && <InventoryColumn title="Shared Inventory" icon={<Users />} groupedData={groupedShared} onRowClick={handleRowClick} />}
        <InventoryColumn title="Private Inventory" icon={<Lock />} groupedData={groupedPrivate} onRowClick={handleRowClick} />
      </div>


      <AddInventoryItemDialog
        isOpen={isAddDialogOpen}
        setIsOpen={setIsAddDialogOpen}
        onItemAdded={handleItemAdded}
      />

      {selectedGroup && (
        <ViewInventoryItemDialog
          isOpen={isViewDialogOpen}
          setIsOpen={setIsViewDialogOpen}
          group={selectedGroup.group}
          isPrivate={selectedGroup.isPrivate}
          onUpdateComplete={handleUpdateComplete}
        />
      )}
    </>
  );
}
