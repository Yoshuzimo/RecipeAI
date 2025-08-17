import MainLayout from "@/components/main-layout";
import InventoryClient from "@/components/inventory-client";
import { getInventory } from "@/lib/data";
import type { InventoryItem, InventoryItemGroup } from "@/lib/types";

export default async function InventoryPage() {
  const inventoryData = await getInventory();

  const groupedInventory = inventoryData.reduce<InventoryItemGroup[]>((acc, item) => {
    let group = acc.find(g => g.name === item.name && g.unit === item.unit);
    if (!group) {
      group = { 
        name: item.name, 
        items: [], 
        totalQuantity: 0, 
        unit: item.unit, 
        nextExpiry: null 
      };
      acc.push(group);
    }
    
    group.items.push(item);
    group.totalQuantity += item.quantity;
    
    const sortedItems = group.items.sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());
    group.items = sortedItems;
    group.nextExpiry = sortedItems[0]?.expiryDate ?? null;

    return acc;
  }, []);

  const sortedGroupedInventory = groupedInventory.sort((a,b) => {
    if (!a.nextExpiry) return 1;
    if (!b.nextExpiry) return -1;
    return a.nextExpiry.getTime() - b.nextExpiry.getTime();
  });


  return (
    <MainLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <InventoryClient initialData={sortedGroupedInventory} allItems={inventoryData} />
      </div>
    </MainLayout>
  );
}
