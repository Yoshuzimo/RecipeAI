import MainLayout from "@/components/main-layout";
import InventoryClient from "@/components/inventory-client";
import { getInventory, getStorageLocations } from "@/lib/data";
import type { InventoryItem, InventoryItemGroup, GroupedByLocation, StorageLocation } from "@/lib/types";

export default async function InventoryPage() {
  const inventoryData = await getInventory();
  const storageLocations = await getStorageLocations();

  const groupItems = (items: InventoryItem[]): InventoryItemGroup[] => {
     const grouped = items.reduce<Record<string, InventoryItemGroup>>((acc, item) => {
      const key = `${item.name}-${item.unit}`;
      if (!acc[key]) {
        acc[key] = { 
          name: item.name, 
          items: [], 
          totalQuantity: 0, 
          unit: item.unit, 
          nextExpiry: null 
        };
      }
      
      const group = acc[key];
      group.items.push(item);
      group.totalQuantity += (item.packageSize * item.packageCount);
      
      const sortedItems = group.items.sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());
      group.items = sortedItems;
      group.nextExpiry = sortedItems[0]?.expiryDate ?? null;

      return acc;
    }, {});

    return Object.values(grouped).sort((a,b) => {
      if (!a.nextExpiry) return 1;
      if (!b.nextExpiry) return -1;
      return a.nextExpiry.getTime() - b.nextExpiry.getTime();
    });
  };

  const locationMap = new Map(storageLocations.map(loc => [loc.id, loc.type]));

  const groupedByLocation: GroupedByLocation = {
    Fridge: groupItems(inventoryData.filter(item => locationMap.get(item.locationId) === 'Fridge')),
    Freezer: groupItems(inventoryData.filter(item => locationMap.get(item.locationId) === 'Freezer')),
    Pantry: groupItems(inventoryData.filter(item => locationMap.get(item.locationId) === 'Pantry')),
  };

  return (
    <MainLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <InventoryClient initialData={groupedByLocation} allItems={inventoryData} storageLocations={storageLocations} />
      </div>
    </MainLayout>
  );
}
