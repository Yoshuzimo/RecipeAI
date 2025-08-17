import MainLayout from "@/components/main-layout";
import InventoryClient from "@/components/inventory-client";
import { getInventory, getStorageLocations } from "@/lib/data";
import type { InventoryItem, InventoryItemGroup, GroupedByLocation, StorageLocation } from "@/lib/types";

export default async function InventoryPage() {
  const inventoryData = await getInventory();
  const storageLocations = await getStorageLocations();

  const groupItems = (items: InventoryItem[]): InventoryItemGroup[] => {
    // First, group by item name and unit.
    const groupedByName = items.reduce<Record<string, { items: InventoryItem[], unit: Unit }>>((acc, item) => {
      const key = `${item.name}-${item.unit}`;
      if (!acc[key]) {
        acc[key] = { items: [], unit: item.unit };
      }
      acc[key].items.push(item);
      return acc;
    }, {});

    // Now, map over the grouped items to create the final structure.
    const finalGroups = Object.entries(groupedByName).map(([key, groupData]) => {
      const { items, unit } = groupData;
      const name = items[0].name;

      // Group by originalQuantity to count packages of the same size.
      const packageCounts = items.reduce<Record<string, { count: number, items: InventoryItem[] }>>((acc, item) => {
        const packageKey = item.originalQuantity.toString();
        if (!acc[packageKey]) {
          acc[packageKey] = { count: 0, items: [] };
        }
        acc[packageKey].count++;
        acc[packageKey].items.push(item);
        return acc;
      }, {});
      
      const packageInfo = Object.entries(packageCounts).map(([size, data]) => {
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


      const sortedItems = items.sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());
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
