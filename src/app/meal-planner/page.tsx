

import MainLayout from "@/components/main-layout";
import { MealPlanner } from "@/components/meal-planner";
import { getClientInventory, getClientSavedRecipes, getClientPersonalDetails, getClientTodaysMacros } from "@/app/actions";

export const dynamic = 'force-dynamic';

export default async function MealPlannerPage() {
  const inventory = await getClientInventory();
  const savedRecipes = await getClientSavedRecipes();
  const personalDetails = await getClientPersonalDetails();
  const todaysMacros = await getClientTodaysMacros();

  return (
    <MainLayout>
      <div className="w-full max-w-6xl mx-auto space-y-4 p-4 md:p-8 pt-6">
          <MealPlanner 
              initialInventory={inventory} 
              initialSavedRecipes={savedRecipes} 
              personalDetails={personalDetails}
              todaysMacros={todaysMacros}
          />
      </div>
    </MainLayout>
  );
}
