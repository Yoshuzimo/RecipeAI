import MainLayout from "@/components/main-layout";
import { NutritionChart } from "@/components/nutrition-chart";
import { Separator } from "@/components/ui/separator";

export default function NutritionPage() {
  return (
    <MainLayout>
      <div className="space-y-6 p-4 md:p-10 pb-16">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-bold tracking-tight">Nutrition</h2>
          <p className="text-muted-foreground">
            Track your macronutrient consumption over time.
          </p>
        </div>
        <Separator />
        <NutritionChart />
      </div>
    </MainLayout>
  );
}
