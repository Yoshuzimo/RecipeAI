

import MainLayout from "@/components/main-layout";
import { MealPlanner } from "@/components/meal-planner";
import { getClientInventory, getClientSavedRecipes } from "@/app/actions";

export const dynamic = 'force-dynamic';

export default async function MealPlannerPage() {
  const inventory = await getClientInventory();
  const savedRecipes = await getClientSavedRecipes();

  return (
    <MainLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
          <MealPlanner initialInventory={inventory} initialSavedRecipes={savedRecipes} />
      </div>
    </MainLayout>
  );
}
