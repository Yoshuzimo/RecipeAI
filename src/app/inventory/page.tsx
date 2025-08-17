import MainLayout from "@/components/main-layout";
import InventoryClient from "@/components/inventory-client";
import { getInventory } from "@/lib/data";

export default async function InventoryPage() {
  const inventoryData = await getInventory();

  return (
    <MainLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <InventoryClient initialData={inventoryData} />
      </div>
    </MainLayout>
  );
}
