
import MainLayout from "@/components/main-layout";
import { MealPlanner } from "@/components/meal-planner";
import { getInventory, getSavedRecipes } from "@/lib/data";

export default async function MealPlannerPage() {
  const inventory = await getInventory();
  const savedRecipes = await getSavedRecipes();

  return (
    <MainLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <MealPlanner initialInventory={inventory} initialSavedRecipes={savedRecipes} />
      </div>
    </MainLayout>
  );
}
