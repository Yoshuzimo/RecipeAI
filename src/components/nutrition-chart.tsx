
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

export function NutritionChart({ data, timeframe }: { data: any[], timeframe: "daily" | "weekly" | "monthly" }) {

  const chartData = React.useMemo(() => {
    if (timeframe === 'daily') {
        return data.map(d => ({
            name: d.meal,
            protein: d.totals.protein,
            carbs: d.totals.carbs,
            fat: d.totals.fat,
            dishes: d.dishes,
        }));
    }
    if (timeframe === 'weekly') {
        return data.map(d => ({
            name: d.day,
            protein: d.protein,
            carbs: d.carbs,
            fat: d.fat,
        }));
    }
    return [];
  }, [data, timeframe]);

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
        {dataEntry.dishes && dataEntry.dishes.map((dish: any, index: number) => (
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
                            const label = chartConfig[name.toLowerCase() as keyof typeof chartConfig]?.label || name;
                            return `${label}: ${Number(value).toFixed(0)}g`;
                        }}
                        labelFormatter={(label) => {
                            if (timeframe === 'weekly') {
                                const dayData = data.find(d => d.day === label);
                                if (dayData) {
                                    return (
                                        <div className="font-bold">
                                            {dayData.day} ({dayData.calories.toFixed(0)} cal)
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
            <Bar dataKey="fat" fill="var(--color-fat)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
