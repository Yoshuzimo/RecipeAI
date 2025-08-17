import MainLayout from "@/components/main-layout";
import { ShoppingList } from "@/components/shopping-list";
import { getInventory, getPersonalDetails } from "@/lib/data";

export default async function ShoppingListPage() {
  const inventory = await getInventory();
  const personalDetails = await getPersonalDetails();

  return (
    <MainLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Shopping List</h1>
        </div>
        <ShoppingList inventory={inventory} personalDetails={personalDetails} />
      </div>
    </MainLayout>
  );
}
