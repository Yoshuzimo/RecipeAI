
import MainLayout from "@/components/main-layout";
import { ShoppingList } from "@/components/shopping-list";
import { getClientInventory, getClientPersonalDetails, getClientShoppingList } from "@/app/actions";

export const dynamic = 'force-dynamic';

export default async function ShoppingListPage() {
  const { privateItems, sharedItems } = await getClientInventory();
  const personalDetails = await getClientPersonalDetails();
  const shoppingList = await getClientShoppingList();

  // Combine private and shared items into a single array
  const inventory = [...privateItems, ...sharedItems];

  return (
    <MainLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <ShoppingList 
            initialInventory={inventory} 
            personalDetails={personalDetails} 
            initialShoppingList={shoppingList}
        />
      </div>
    </MainLayout>
  );
}
