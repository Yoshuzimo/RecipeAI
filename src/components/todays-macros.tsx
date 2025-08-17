
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
import { getTodaysMacros } from "@/lib/data"
import type { DailyMacros } from "@/lib/types"

const dailyGoals = {
    protein: 180,
    carbs: 300,
    fat: 100
}

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
}

export function TodaysMacros() {
  const [dailyData, setDailyData] = React.useState<DailyMacros[]>([]);

  React.useEffect(() => {
    async function fetchData() {
        const data = await getTodaysMacros();
        setDailyData(data);
    }
    fetchData();
  }, []);

  const totals = React.useMemo(() => {
    return dailyData.reduce((acc, meal) => {
        acc.protein += meal.protein;
        acc.carbs += meal.carbs;
        acc.fat += meal.fat;
        return acc;
    }, { protein: 0, carbs: 0, fat: 0 });
  }, [dailyData]);

  const remaining = {
    protein: Math.max(0, dailyGoals.protein - totals.protein),
    carbs: Math.max(0, dailyGoals.carbs - totals.carbs),
    fat: Math.max(0, dailyGoals.fat - totals.fat),
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
            <BarChart data={dailyData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                dataKey="meal"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                />
                <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => `${value}g`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="protein" fill="var(--color-protein)" radius={4} />
                <Bar dataKey="carbs" fill="var(--color-carbs)" radius={4} />
                <Bar dataKey="fat" fill="var(--color-fat)" radius={4} />
            </BarChart>
        </ChartContainer>
      </CardContent>
       <CardFooter className="flex-col items-start gap-4">
        <Separator />
        <div className="flex w-full justify-around gap-4 text-center">
            <div>
                <p className="text-sm text-muted-foreground">Protein</p>
                <p className="font-bold text-lg">{totals.protein.toFixed(0)}g / <span className="text-muted-foreground font-normal">{dailyGoals.protein}g</span></p>
                <p className="text-xs text-green-600">{remaining.protein.toFixed(0)}g left</p>
            </div>
            <Separator orientation="vertical" className="h-auto" />
             <div>
                <p className="text-sm text-muted-foreground">Carbs</p>
                <p className="font-bold text-lg">{totals.carbs.toFixed(0)}g / <span className="text-muted-foreground font-normal">{dailyGoals.carbs}g</span></p>
                <p className="text-xs text-green-600">{remaining.carbs.toFixed(0)}g left</p>
            </div>
            <Separator orientation="vertical" className="h-auto" />
             <div>
                <p className="text-sm text-muted-foreground">Fat</p>
                <p className="font-bold text-lg">{totals.fat.toFixed(0)}g / <span className="text-muted-foreground font-normal">{dailyGoals.fat}g</span></p>
                <p className="text-xs text-green-600">{remaining.fat.toFixed(0)}g left</p>
            </div>
        </div>
      </CardFooter>
    </Card>
  )
}
