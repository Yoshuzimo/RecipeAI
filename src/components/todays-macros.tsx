

"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { Separator } from "./ui/separator"
import type { DailyMacros, Settings, PersonalDetails } from "@/lib/types"
import { CalorieLineChart } from "./ui/calorie-line-chart"
import { isWithinUserDay } from "@/lib/utils"
import { Button } from "./ui/button"
import { Edit } from "lucide-react"
import { EditGoalsDialog } from "./edit-goals-dialog"
import { getClientPersonalDetails } from "../app/actions"


const chartConfig = {
  protein: {
    label: "Protein",
    color: "hsl(var(--primary))",
  },
  carbs: {
    label: "Carbs",
    color: "hsl(var(--accent))",
  },
  fat: {
    label: "Fat",
    color: "hsl(var(--secondary-foreground))",
  },
   dishes: {
    label: "Dishes"
  }
}

const mealOrder: Array<DailyMacros['meal']> = ["Breakfast", "Lunch", "Dinner", "Snack"];

export function TodaysMacros({ dailyData, settings: initialSettings, onDataChange }: {
    dailyData: DailyMacros[],
    settings: Settings | null,
    onDataChange: () => void,
}) {
  const [settings, setSettings] = React.useState(initialSettings);
  const [isGoalsDialogOpen, setIsGoalsDialogOpen] = React.useState(false);
  const [personalDetails, setPersonalDetails] = React.useState<PersonalDetails | null>(null);

  React.useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings]);
  
  React.useEffect(() => {
    async function loadDetails() {
        const details = await getClientPersonalDetails();
        setPersonalDetails(details);
    }
    if (isGoalsDialogOpen) {
        loadDetails();
    }
  }, [isGoalsDialogOpen]);

  const todaysData = React.useMemo(() => {
    const dayStartTime = settings?.dayStartTime || "00:00";
    return dailyData.filter(d => isWithinUserDay(d.loggedAt, dayStartTime));
  }, [dailyData, settings]);

  const totals = React.useMemo(() => {
    return todaysData.reduce((acc, meal) => {
        const calories = (meal.totals.protein * 4) + (meal.totals.carbs * 4) + (meal.totals.fat * 9);
        acc.calories += calories;
        acc.protein += meal.totals.protein;
        acc.carbs += meal.totals.carbs;
        acc.fat += meal.totals.fat;
        acc.fiber += meal.totals.fiber || 0;
        return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
  }, [todaysData]);

  const goals = {
      calories: settings?.calorieGoal || 2000,
      protein: settings?.proteinGoal || 150,
      carbs: settings?.carbsGoal || 250,
      fat: settings?.fatGoal || 70,
      fiber: settings?.fiberGoal || 30,
  }

  const chartData = React.useMemo(() => {
     const dataMap = new Map(todaysData.map(d => [d.meal, d]));
     return mealOrder.map(mealName => {
        const mealData = dataMap.get(mealName);
        if (mealData) {
            const calories = (mealData.totals.protein * 4) + (mealData.totals.carbs * 4) + (mealData.totals.fat * 9);
            return {
                meal: mealData.meal,
                protein: goals.protein > 0 ? (mealData.totals.protein / goals.protein) * 100 : 0,
                carbs: goals.carbs > 0 ? (mealData.totals.carbs / goals.carbs) * 100 : 0,
                fat: goals.fat > 0 ? (mealData.totals.fat / goals.fat) * 100 : 0,
                proteinGrams: mealData.totals.protein,
                carbsGrams: mealData.totals.carbs,
                fatGrams: mealData.totals.fat,
                dishes: mealData.dishes,
            }
        }
        return {
            meal: mealName,
            protein: 0,
            carbs: 0,
            fat: 0,
            proteinGrams: 0,
            carbsGrams: 0,
            fatGrams: 0,
            dishes: [],
        }
     });
  }, [todaysData, goals]);

  const remaining = {
    calories: Math.max(0, goals.calories - totals.calories),
    protein: Math.max(0, goals.protein - totals.protein),
    carbs: Math.max(0, goals.carbs - totals.carbs),
    fat: Math.max(0, goals.fat - totals.fat),
    fiber: Math.max(0, goals.fiber - totals.fiber),
  }

  const CustomMacroTick = (props: any) => {
    const { x, y, payload } = props;
    const mealName = payload.value;
    
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={16} textAnchor="middle" fill="#666" fontSize={12} fontWeight="bold">
          {mealName}
        </text>
      </g>
    );
  };

  const handleGoalsUpdated = (newSettings: Settings) => {
    setSettings(newSettings);
    onDataChange(); // Refresh parent data if needed
  }
  
  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Today's Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="pb-4 space-y-8">
        <CalorieLineChart data={todaysData} goal={goals.calories} settings={settings} timeframe="daily" onDataChange={onDataChange} />
        
        <ChartContainer config={chartConfig} className="w-full h-[400px]">
            <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="meal"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={<CustomMacroTick />}
                  interval={0}
                />
                <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => `${value}%`}
                />
                 <ChartTooltip
                    cursor={false}
                    content={
                        <ChartTooltipContent
                        formatter={(value, name, item) => {
                            const originalGrams = item.payload[`${name}Grams`];
                            return `${originalGrams.toFixed(0)}g`;
                        }}
                        />
                    }
                    />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="protein" fill="var(--color-protein)" radius={4} />
                <Bar dataKey="carbs" fill="var(--color-carbs)" radius={4} />
                <Bar dataKey="fat" fill="var(--color-fat)" radius={4} />
            </BarChart>
        </ChartContainer>
      </CardContent>
       <CardFooter className="flex-col items-start gap-4">
        <Separator />
        <div className="flex w-full justify-around gap-2 text-center">
            <div>
                <p className="text-sm text-muted-foreground">Calories</p>
                <p className="font-bold text-lg">{totals.calories.toFixed(0)} / <span className="text-muted-foreground font-normal">{goals.calories}</span></p>
                <p className="text-xs text-green-600">{remaining.calories.toFixed(0)} left</p>
            </div>
            <Separator orientation="vertical" className="h-auto" />
            <div>
                <p className="text-sm text-muted-foreground">Protein</p>
                <p className="font-bold text-lg">{totals.protein.toFixed(0)}g / <span className="text-muted-foreground font-normal">{goals.protein}g</span></p>
                <p className="text-xs text-green-600">{remaining.protein.toFixed(0)}g left</p>
            </div>
            <Separator orientation="vertical" className="h-auto" />
             <div>
                <p className="text-sm text-muted-foreground">Carbs</p>
                <p className="font-bold text-lg">{totals.carbs.toFixed(0)}g / <span className="text-muted-foreground font-normal">{goals.carbs}g</span></p>
                <p className="text-xs text-green-600">{remaining.carbs.toFixed(0)}g left</p>
            </div>
            <Separator orientation="vertical" className="h-auto" />
             <div>
                <p className="text-sm text-muted-foreground">Fat</p>
                <p className="font-bold text-lg">{totals.fat.toFixed(0)}g / <span className="text-muted-foreground font-normal">{goals.fat}g</span></p>
                <p className="text-xs text-green-600">{remaining.fat.toFixed(0)}g left</p>
            </div>
            <Separator orientation="vertical" className="h-auto" />
             <div className="relative">
                <p className="text-sm text-muted-foreground">Fiber</p>
                <p className="font-bold text-lg">{totals.fiber.toFixed(0)}g / <span className="text-muted-foreground font-normal">{goals.fiber}g</span></p>
                <p className="text-xs text-green-600">{remaining.fiber.toFixed(0)}g left</p>
                <Button variant="ghost" size="icon" className="absolute -top-2 -right-8 h-6 w-6" onClick={() => setIsGoalsDialogOpen(true)}>
                    <Edit className="h-3 w-3" />
                </Button>
            </div>
        </div>
      </CardFooter>
    </Card>

    {isGoalsDialogOpen && settings && (
        <EditGoalsDialog
            isOpen={isGoalsDialogOpen}
            setIsOpen={setIsGoalsDialogOpen}
            settings={settings}
            onGoalsUpdated={handleGoalsUpdated}
        />
    )}
    </>
  )
}
