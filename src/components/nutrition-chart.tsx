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
  { date: "Mon", protein: 120, carbs: 200, fat: 80 },
  { date: "Tue", protein: 110, carbs: 190, fat: 70 },
  { date: "Wed", protein: 130, carbs: 210, fat: 90 },
  { date: "Thu", protein: 100, carbs: 180, fat: 60 },
  { date: "Fri", protein: 140, carbs: 220, fat: 85 },
  { date: "Sat", protein: 150, carbs: 240, fat: 95 },
  { date: "Sun", protein: 135, carbs: 215, fat: 75 },
]

const weeklyData = [
    { week: "W1", protein: 855, carbs: 1455, fat: 555 },
    { week: "W2", protein: 830, carbs: 1400, fat: 520 },
    { week: "W3", protein: 880, carbs: 1500, fat: 580 },
    { week: "W4", protein: 860, carbs: 1470, fat: 560 },
];

const monthlyData = [
    { month: "Jan", protein: 3420, carbs: 5820, fat: 2220 },
    { month: "Feb", protein: 3320, carbs: 5600, fat: 2080 },
    { month: "Mar", protein: 3520, carbs: 6000, fat: 2320 },
    { month: "Apr", protein: 3440, carbs: 5880, fat: 2240 },
    { month: "May", protein: 3490, carbs: 5950, fat: 2280 },
    { month: "Jun", protein: 3550, carbs: 6050, fat: 2350 },
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

  const data = React.useMemo(() => {
    switch (timeframe) {
      case "weekly":
        return weeklyData
      case "monthly":
        return monthlyData
      case "daily":
      default:
        return dailyData
    }
  }, [timeframe])

  const dateKey = React.useMemo(() => {
      switch (timeframe) {
          case 'weekly': return 'week';
          case 'monthly': return 'month';
          default: return 'date';
      }
  }, [timeframe]);

  return (
    <Card>
      <CardHeader className="flex-col items-start sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Macronutrient Breakdown</CardTitle>
          <CardDescription>A summary of your daily intake.</CardDescription>
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
              dataKey={dateKey}
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
