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
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const dailyData = [
    { meal: "Breakfast", protein: 30, carbs: 50, fat: 20 },
    { meal: "Lunch", protein: 50, carbs: 80, fat: 35 },
    { meal: "Dinner", protein: 45, carbs: 65, fat: 30 },
    { meal: "Snacks", protein: 15, carbs: 25, fat: 10 },
]

const weeklyData = [
  { day: "Mon", protein: 120, carbs: 200, fat: 80 },
  { day: "Tue", protein: 110, carbs: 190, fat: 70 },
  { day: "Wed", protein: 130, carbs: 210, fat: 90 },
  { day: "Thu", protein: 100, carbs: 180, fat: 60 },
  { day: "Fri", protein: 140, carbs: 220, fat: 85 },
  { day: "Sat", protein: 150, carbs: 240, fat: 95 },
  { day: "Sun", protein: 135, carbs: 215, fat: 75 },
]

const monthlyData = [
    { week: "Week 1", protein: 855, carbs: 1455, fat: 555 },
    { week: "Week 2", protein: 830, carbs: 1400, fat: 520 },
    { week: "Week 3", protein: 880, carbs: 1500, fat: 580 },
    { week: "Week 4", protein: 860, carbs: 1470, fat: 560 },
];


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
}

export function NutritionChart() {
  const [timeframe, setTimeframe] = React.useState<"daily" | "weekly" | "monthly">("daily")

  const { data, dataKey, description } = React.useMemo(() => {
    switch (timeframe) {
      case "weekly":
        return { 
            data: weeklyData, 
            dataKey: "day",
            description: "A summary of your weekly intake, day by day."
        }
      case "monthly":
        return { 
            data: monthlyData, 
            dataKey: "week",
            description: "A summary of your monthly intake, week by week."
        }
      case "daily":
      default:
        return { 
            data: dailyData, 
            dataKey: "meal",
            description: "A summary of your daily intake, meal by meal."
        }
    }
  }, [timeframe])

  return (
    <Card>
      <CardHeader className="flex-col items-start sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Macronutrient Breakdown</CardTitle>
          <CardDescription>{description}</CardDescription>
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
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[300px]">
          <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey={dataKey}
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
    </Card>
  )
}
