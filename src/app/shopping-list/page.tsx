import MainLayout from "@/components/main-layout";
import { ShoppingList } from "@/components/shopping-list";
import { getInventory } from "@/lib/data";

export default async function ShoppingListPage() {
  const inventory = await getInventory();

  // In a real app, personal details would be fetched from a secure store
  const personalDetails = {
    healthGoals: "Build muscle, maintain weight",
    dietaryRestrictions: "Lactose intolerant",
    allergies: "None",
    favoriteFoods: "Chicken, Salmon, Sweet Potatoes, Avocado",
    dislikedFoods: "Olives, Mushrooms",
    healthConditions: "None",
    medications: "None"
  };

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
