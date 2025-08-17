
import MainLayout from "@/components/main-layout";
import { NutritionChart } from "@/components/nutrition-chart";
import { getTodaysMacros } from "@/lib/data";
import { Separator } from "@/components/ui/separator";
import { CalorieLineChart } from "@/components/calorie-line-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NutritionPage() {
  const dailyData = await getTodaysMacros();
  // In a real app, this would come from user settings
  const dailyGoal = 2200; 

  return (
    <MainLayout>
      <div className="space-y-6 p-4 md:p-10 pb-16">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-bold tracking-tight">Nutrition</h2>
          <p className="text-muted-foreground">
            Track your macronutrient and calorie consumption over time.
          </p>
        </div>
        <Separator />
         <Card>
            <CardHeader>
                <CardTitle>Today's Calorie Intake</CardTitle>
            </CardHeader>
            <CardContent>
                <CalorieLineChart dailyData={dailyData} dailyGoal={dailyGoal} />
            </CardContent>
         </Card>
        <NutritionChart dailyData={dailyData} />
      </div>
    </MainLayout>
  );
}
