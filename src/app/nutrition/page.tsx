
"use client";

import * as React from "react";
import MainLayout from "@/components/main-layout";
import { NutritionChart } from "@/components/nutrition-chart";
import { getAllMacros, getClientHousehold, getSettings } from "@/app/actions";
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
import { startOfWeek, endOfWeek, format, addDays, subDays } from "date-fns";
import { useAuth } from "@/components/auth-provider";
import { PendingMealCard } from "@/components/pending-meal-card";
import { getUserDay, isWithinUserDay } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Settings as SettingsIcon } from 'lucide-react';


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
      getAllMacros(),
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
    
    const getEmptyTotals = () => ({
        calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0,
        fats: { saturated: 0, monounsaturated: 0, polyunsaturated: 0, trans: 0 },
    });

    switch (timeframe) {
      case "monthly": {
        const dateArray = Array.from({ length: 30 }, (_, i) => subDays(now, i)).reverse();
        const dailyTotals = dateArray.map(date => {
            const dayMeals = allDailyData.filter(meal => getUserDay(meal.loggedAt, dayStartTime).toDateString() === date.toDateString());
            
            const totals = dayMeals.reduce((acc, meal) => {
                acc.calories += meal.totals.calories || 0;
                acc.protein += meal.totals.protein || 0;
                acc.carbs += meal.totals.carbs || 0;
                acc.fat += meal.totals.fat || 0;
                acc.fiber += meal.totals.fiber || 0;
                acc.fats.saturated += meal.totals.fats?.saturated || 0;
                acc.fats.monounsaturated += meal.totals.fats?.monounsaturated || 0;
                acc.fats.polyunsaturated += meal.totals.fats?.polyunsaturated || 0;
                acc.fats.trans += meal.totals.fats?.trans || 0;
                return acc;
            }, getEmptyTotals());

            return {
                day: format(date, 'M/d'),
                date: date,
                ...totals
            };
        });
        return { 
            dataForCharts: dailyTotals, 
            description: "Your total calorie intake per day for the last 30 days.",
        }
      }
      case "weekly": {
        const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday

        const dailyTotals = Array.from({ length: 7 }, (_, i) => {
            const day = addDays(weekStart, i);
            const dayMeals = allDailyData.filter(meal => getUserDay(meal.loggedAt, dayStartTime).toDateString() === day.toDateString());

            const totals = dayMeals.reduce((acc, meal) => {
                acc.calories += meal.totals.calories || 0;
                acc.protein += meal.totals.protein || 0;
                acc.carbs += meal.totals.carbs || 0;
                acc.fat += meal.totals.fat || 0;
                acc.fiber += meal.totals.fiber || 0;
                acc.fats.saturated += meal.totals.fats?.saturated || 0;
                acc.fats.monounsaturated += meal.totals.fats?.monounsaturated || 0;
                acc.fats.polyunsaturated += meal.totals.fats?.polyunsaturated || 0;
                acc.fats.trans += meal.totals.fats?.trans || 0;
                return acc;
            }, getEmptyTotals());

            return {
                day: format(day, 'E'),
                date: day,
                ...totals
            };
        });

        return { 
            dataForCharts: dailyTotals, 
            description: "Your total calorie and macronutrient intake per day for the current week.",
        }
      }
      case "daily":
      default: {
        const todaysData = allDailyData.filter(d => isWithinUserDay(d.loggedAt, dayStartTime));
        const mealDataMap = new Map(todaysData.map(d => [d.meal, d]));

        const finalData = mealOrder.map(mealName => {
            if (mealDataMap.has(mealName)) {
                return mealDataMap.get(mealName)!;
            }
            return {
                id: `${mealName}-${Date.now()}`,
                meal: mealName,
                dishes: [],
                totals: getEmptyTotals(),
                loggedAt: new Date(), // Placeholder date
            }
        });
        
        return { 
            dataForCharts: finalData,
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
          <div className="flex items-center gap-2">
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
            <Button variant="outline" size="icon" asChild>
                <Link href="/settings">
                    <SettingsIcon className="h-4 w-4" />
                    <span className="sr-only">Go to Settings</span>
                </Link>
            </Button>
           </div>
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
                <CalorieLineChart data={dataForCharts} timeframe={timeframe} settings={settings} onDataChange={fetchData} />
            </CardContent>
         </Card>
        <NutritionChart data={dataForCharts} timeframe={timeframe} settings={settings} />
        
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
