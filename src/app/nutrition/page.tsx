
"use client";

import * as React from "react";
import MainLayout from "@/components/main-layout";
import { NutritionChart } from "@/components/nutrition-chart";
import { getClientTodaysMacros } from "@/app/actions";
import { Separator } from "@/components/ui/separator";
import { CalorieLineChart } from "@/components/calorie-line-chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MOCK_NUTRITION_DATA } from "@/lib/mock-nutrition-data";
import type { DailyMacros } from "@/lib/types";

export default function NutritionPage() {
  const [dailyData, setDailyData] = React.useState<DailyMacros[]>([]);
  const [timeframe, setTimeframe] = React.useState<"daily" | "weekly" | "monthly">("daily");
  
  const fetchData = React.useCallback(async () => {
    const data = await getClientTodaysMacros();
    setDailyData(data);
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { data, goal, description } = React.useMemo(() => {
    switch (timeframe) {
      case "weekly":
        return { 
            data: MOCK_NUTRITION_DATA.weekly, 
            goal: MOCK_NUTRITION_DATA.dailyGoal * 7,
            description: "Your total calorie intake per day for the last week."
        }
      case "monthly":
        return { 
            data: MOCK_NUTRITION_DATA.monthly, 
            goal: MOCK_NUTRITION_DATA.dailyGoal * 30,
            description: "Your total calorie intake per week for the last month."
        }
      case "daily":
      default:
        return { 
            data: dailyData,
            goal: MOCK_NUTRITION_DATA.dailyGoal,
            description: "A running total of your calorie intake for today."
        }
    }
  }, [timeframe, dailyData]);

  return (
    <MainLayout>
      <div className="space-y-6 p-4 md:p-10 pb-16">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-0.5">
            <h2 className="text-2xl font-bold tracking-tight">Nutrition</h2>
            <p className="text-muted-foreground">
              Track your macronutrient and calorie consumption over time.
            </p>
          </div>
           <Select value={timeframe} onValueChange={(value) => setTimeframe(value as any)}>
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
            </Select>
        </div>
        <Separator />
         <Card>
            <CardHeader>
                <CardTitle>Calorie Intake</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <CalorieLineChart data={dailyData} goal={goal} timeframe={timeframe} onDataChange={fetchData} />
            </CardContent>
         </Card>
        {timeframe === 'daily' && <NutritionChart dailyData={dailyData} />}
      </div>
    </MainLayout>
  );
}
