import MainLayout from "@/components/main-layout";
import { MealPlanner } from "@/components/meal-planner";
import { getInventory } from "@/lib/data";

export default async function MealPlannerPage() {
  const inventory = await getInventory();

  return (
    <MainLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <MealPlanner initialInventory={inventory} />
      </div>
    </MainLayout>
  );
}
