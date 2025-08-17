
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
   dishes: {
    label: "Dishes"
  }
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

  const chartData = React.useMemo(() => {
     return dailyData.map(d => ({
        meal: d.meal,
        protein: d.totals.protein,
        carbs: d.totals.carbs,
        fat: d.totals.fat,
        dishes: d.dishes,
    }));
  }, [dailyData]);

  const totals = React.useMemo(() => {
    return dailyData.reduce((acc, meal) => {
        acc.protein += meal.totals.protein;
        acc.carbs += meal.totals.carbs;
        acc.fat += meal.totals.fat;
        return acc;
    }, { protein: 0, carbs: 0, fat: 0 });
  }, [dailyData]);

  const remaining = {
    protein: Math.max(0, dailyGoals.protein - totals.protein),
    carbs: Math.max(0, dailyGoals.carbs - totals.carbs),
    fat: Math.max(0, dailyGoals.fat - totals.fat),
  }

  const CustomTick = (props: any) => {
    const { x, y, payload } = props;
    const mealName = payload.value;
    const dataEntry = chartData.find(d => d.meal === mealName);
    
    if (!dataEntry) return null;

    const { dishes } = dataEntry;

    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={16} textAnchor="middle" fill="#666" fontSize={12} fontWeight="bold">
          {mealName}
        </text>
        {dishes.map((dish, index) => (
           <text key={index} x={0} y={20} dy={(index + 1) * 12} textAnchor="middle" fill="#888" fontSize={10}>
                {dish.name}
            </text>
        ))}
      </g>
    );
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <ChartContainer config={chartConfig} className="min-h-[400px] w-full">
            <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 100, left: 20 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="meal"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={<CustomTick />}
                  interval={0}
                  height={100}
                />
                <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => `${value}g`}
                />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} cursor={{fill: 'hsl(var(--muted))'}} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="protein" fill="var(--color-protein)" radius={4} stackId="a" />
                <Bar dataKey="carbs" fill="var(--color-carbs)" radius={4} stackId="a" />
                <Bar dataKey="fat" fill="var(--color-fat)" radius={4} stackId="a" />
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
