
"use client";

import * as React from "react";
import MainLayout from "@/components/main-layout";
import { NutritionChart } from "@/components/nutrition-chart";
import { getClientTodaysMacros, getClientHousehold, getSettings } from "@/app/actions";
import { Separator } from "@/components/ui/separator";
import { CalorieLineChart } from "@/components/ui/calorie-line-chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DailyMacros, Household, Settings } from "@/lib/types";
import { isWithinInterval, startOfWeek, endOfWeek, format } from "date-fns";
import { useAuth } from "@/components/auth-provider";
import { PendingMealCard } from "@/components/pending-meal-card";
import { isWithinUserDay } from "@/lib/utils";

export const dynamic = 'force-dynamic';

const mealOrder: Array<DailyMacros['meal']> = ["Breakfast", "Lunch", "Dinner", "Snack"];

export default function NutritionPage() {
  const { user } = useAuth();
  const [allDailyData, setAllDailyData] = React.useState<DailyMacros[]>([]);
  const [household, setHousehold] = React.useState<Household | null>(null);
  const [settings, setSettings] = React.useState<Settings | null>(null);
  const [timeframe, setTimeframe] = React.useState<"daily" | "weekly" | "monthly">("daily");
  
  const fetchData = React.useCallback(async () => {
    const [macrosData, householdData, settingsData] = await Promise.all([
      getClientTodaysMacros(),
      getClientHousehold(),
      getSettings(),
    ]);
    setAllDailyData(macrosData);
    setHousehold(householdData);
    setSettings(settingsData);
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const myPendingMeals = React.useMemo(() => {
    if (!household || !user) return [];
    return household.pendingMeals?.filter(meal => meal.pendingUserIds.includes(user.uid)) || [];
  }, [household, user]);

  const { dataForCharts, description } = React.useMemo(() => {
    const now = new Date();
    const dayStartTime = settings?.dayStartTime || "00:00";
    
    switch (timeframe) {
      case "weekly": {
        const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
        const weekData = allDailyData.filter(d => isWithinInterval(d.loggedAt, { start: weekStart, end: weekEnd }));
        
        const dailyTotals = Array.from({ length: 7 }, (_, i) => {
            const day = new Date(weekStart);
            day.setDate(day.getDate() + i);
            return {
                day: format(day, 'E M/d'), // e.g. Mon 8/19
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0,
            }
        });

        weekData.forEach(meal => {
            const dayIndex = (meal.loggedAt.getDay() + 6) % 7; // Monday is 0
            const mealCalories = (meal.totals.protein * 4) + (meal.totals.carbs * 4) + (meal.totals.fat * 9);
            dailyTotals[dayIndex].calories += mealCalories;
            dailyTotals[dayIndex].protein += meal.totals.protein;
            dailyTotals[dayIndex].carbs += meal.totals.carbs;
            dailyTotals[dayIndex].fat += meal.totals.fat;
        });

        return { 
            dataForCharts: dailyTotals, 
            description: "Your total calorie and macronutrient intake per day for the current week.",
        }
      }
      case "monthly":
        return { 
            dataForCharts: [],
            description: "Your total calorie intake per week for the last month.",
        }
      case "daily":
      default: {
        const todaysData = allDailyData.filter(d => isWithinUserDay(d.loggedAt, dayStartTime));
        const sortedTodaysData = todaysData.sort((a, b) => mealOrder.indexOf(a.meal) - mealOrder.indexOf(b.meal));
        return { 
            dataForCharts: sortedTodaysData,
            description: "A running total of your calorie intake for today.",
        }
      }
    }
  }, [timeframe, allDailyData, settings]);

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
                <CalorieLineChart data={dataForCharts} timeframe={timeframe} onDataChange={fetchData} />
            </CardContent>
         </Card>
        <NutritionChart data={dataForCharts} timeframe={timeframe} />
        
        {myPendingMeals.length > 0 && (
          <div className="space-y-4">
             <Separator />
             <div className="space-y-0.5">
                <h2 className="text-2xl font-bold tracking-tight">Meal Confirmations</h2>
                <p className="text-muted-foreground">
                  Confirm the meals you've shared with your household.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {myPendingMeals.map(meal => (
                  <PendingMealCard key={meal.id} pendingMeal={meal} onConfirm={fetchData} />
                ))}
              </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
