
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
import type { DailyMacros } from "@/lib/types";

export const dynamic = 'force-dynamic';

// Weekly and monthly data would come from a more complex query in a real app
const MOCK_WEEKLY_DATA: any[] = [];
const MOCK_MONTHLY_DATA: any[] = [];


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

  const { data, description } = React.useMemo(() => {
    switch (timeframe) {
      case "weekly":
        return { 
            data: MOCK_WEEKLY_DATA, 
            description: "Your total calorie intake per day for the last week."
        }
      case "monthly":
        return { 
            data: MOCK_MONTHLY_DATA,
            description: "Your total calorie intake per week for the last month."
        }
      case "daily":
      default:
        return { 
            data: dailyData,
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
                <SelectItem value="weekly" disabled>Weekly (Coming Soon)</SelectItem>
                <SelectItem value="monthly" disabled>Monthly (Coming Soon)</SelectItem>
            </SelectContent>
            </Select>
        </div>
        <p className="text-sm text-muted-foreground pt-2">
            Disclaimer: The information on this page is based on available data and is approximate. It should be used as a guide only and not as a replacement for professional medical advice. Always consult your doctor.
        </p>
        <Separator />
         <Card>
            <CardHeader>
                <CardTitle>Calorie Intake</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <CalorieLineChart data={dailyData} timeframe={timeframe} onDataChange={fetchData} />
            </CardContent>
         </Card>
        {timeframe === 'daily' && <NutritionChart dailyData={dailyData} />}
      </div>
    </MainLayout>
  );
}