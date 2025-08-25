
"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"

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
    label: "Protein",
    color: "hsl(var(--chart-1))",
  },
  carbs: {
    label: "Carbs",
    color: "hsl(var(--chart-2))",
  },
  fat: {
    label: "Fat",
    color: "hsl(var(--chart-3))",
  },
  fiber: {
    label: "Fiber",
    color: "hsl(var(--chart-4))",
  },
  saturated: {
    label: "Saturated Fat",
    color: "hsl(var(--chart-5))",
  },
  unsaturated: {
    label: "Unsaturated Fat",
    color: "hsl(var(--chart-2))",
  },
  dishes: {
    label: "Dishes"
  }
}


export function NutritionChart({ data, timeframe }: { data: any[], timeframe: "daily" | "weekly" | "monthly" }) {

  const chartData = React.useMemo(() => {
    const processData = (d: any) => {
        const totals = d.totals || d;
        const unsaturated = (totals.fats?.monounsaturated || 0) + (totals.fats?.polyunsaturated || 0);
        return {
            name: d.meal || d.day,
            protein: totals.protein || 0,
            carbs: totals.carbs || 0,
            fat: totals.fat || 0,
            fiber: totals.fiber || 0,
            saturated: totals.fats?.saturated || 0,
            unsaturated: unsaturated,
            dishes: d.dishes,
        }
    };
    
    return data.map(processData);
  }, [data]);

  const DailyCustomTick = (props: any) => {
    const { x, y, payload } = props;
    const mealName = payload.value;
    const dataEntry = data.find(d => d.meal === mealName);

    if (!dataEntry) {
        return null;
    }
    
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={16} textAnchor="middle" fill="#666" fontSize={12} fontWeight="bold">
          {mealName}
        </text>
        {dataEntry.dishes && dataEntry.dishes.length > 0 && dataEntry.dishes.map((dish: any, index: number) => (
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
        <div>
          <CardTitle>{timeframe === 'daily' ? "Today's" : "This Week's"} Macronutrient Breakdown</CardTitle>
          <CardDescription>
            {timeframe === 'daily' ? "A summary of your daily intake, meal by meal." : "A summary of your intake for each day of the week."}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="w-full h-[400px]">
        <ResponsiveContainer>
          <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: timeframe === 'daily' ? 100 : 20, left: 20 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={timeframe === 'daily' ? <DailyCustomTick /> : undefined}
              interval={0}
              height={timeframe === 'daily' ? 100 : undefined}
            />
            <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => `${value}g`}
            />
            <ChartTooltipContainer 
                content={
                    <ChartTooltipContent 
                        formatter={(value, name, props) => {
                            const { payload } = props;
                            if (!payload || !name) return null;
                            const key = name.toString() as keyof typeof chartConfig;
                            const label = chartConfig[key]?.label || name;
                            if (Number(value) === 0) return null;
                            return `${label}: ${Number(value).toFixed(0)}g`;
                        }}
                        labelFormatter={(label) => {
                            if (timeframe === 'weekly' || timeframe === 'monthly') {
                                const dayData = data.find(d => d.day === label);
                                if (dayData) {
                                    return (
                                        <div className="font-bold">
                                            {label} ({dayData.calories.toFixed(0)} cal)
                                        </div>
                                    )
                                }
                            }
                            return <div className="font-bold">{label}</div>
                        }}
                    />
                } 
                cursor={{fill: 'hsl(var(--muted))'}}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="protein" fill="var(--color-protein)" radius={4} />
            <Bar dataKey="carbs" fill="var(--color-carbs)" radius={4} />
            <Bar dataKey="saturated" name="Saturated Fat" fill="var(--color-saturated)" radius={4} />
            <Bar dataKey="unsaturated" name="Unsaturated Fat" fill="var(--color-unsaturated)" radius={4} />
            <Bar dataKey="fiber" fill="var(--color-fiber)" radius={4} />
          </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
