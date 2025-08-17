import MainLayout from "@/components/main-layout";
import { MealPlanner } from "@/components/meal-planner";
import { getInventory } from "@/lib/data";

export default async function Home() {
  const inventory = await getInventory();

  return (
    <MainLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Meal Planner</h1>
        </div>
        <MealPlanner inventory={inventory} />
      </div>
    </MainLayout>
  );
}
