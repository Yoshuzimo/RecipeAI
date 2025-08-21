
"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip as ChartTooltipContainer,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from "@/components/ui/chart"
import type { DailyMacros } from "@/lib/types"

const chartConfig = {
  protein: {
    label: "Protein (g)",
    color: "hsl(var(--primary))",
  },
  carbs: {
    label: "Carbs (g)",
    color: "hsl(var(--accent))",
  },
  fat: {
    label: "Fat (g)",
    color: "hsl(var(--secondary-foreground))",
  },
  dishes: {
    label: "Dishes"
  }
}

export function NutritionChart({ dailyData }: { dailyData: DailyMacros[] }) {

  const data = React.useMemo(() => {
    const formattedDailyData = dailyData.map(d => ({
        meal: d.meal,
        protein: d.totals.protein,
        carbs: d.totals.carbs,
        fat: d.totals.fat,
        dishes: d.dishes,
    }));
    return formattedDailyData;
  }, [dailyData]);

  const CustomTick = (props: any) => {
    const { x, y, payload } = props;
    const labelValue = payload.value;
    const dataEntry = data.find(d => d.meal === labelValue);

    if (!dataEntry) {
        return null;
    }
    
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={16} textAnchor="middle" fill="#666" fontSize={12} fontWeight="bold">
          {dataEntry.meal}
        </text>
        {dataEntry.dishes && dataEntry.dishes.map((dish: any, index: number) => (
           <text key={index} x={0} y={30} dy={(index + 1) * 12} textAnchor="middle" fill="#888" fontSize={10}>
                {dish.name}
            </text>
        ))}
      </g>
    );
  };


  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Today's Macronutrient Breakdown</CardTitle>
          <CardDescription>A summary of your daily intake, meal by meal.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="w-full h-[400px]">
          <BarChart data={data} margin={{ top: 20, right: 20, bottom: 100, left: 20 }}>
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
            <ChartTooltipContainer content={<ChartTooltipContent hideLabel />} cursor={{fill: 'hsl(var(--muted))'}}/>
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="protein" fill="var(--color-protein)" radius={4} />
            <Bar dataKey="carbs" fill="var(--color-carbs)" radius={4} />
            <Bar dataKey="fat" fill="var(--color-fat)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}