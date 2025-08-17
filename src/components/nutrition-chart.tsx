
"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { DailyMacros } from "@/lib/types"

const MOCK_DATA = {
  daily: [
    { meal: "Breakfast", dishes: [{name: "Omelette"}], protein: 30, carbs: 50, fat: 20 },
    { meal: "Lunch", dishes: [{name: "Chicken Salad"}], protein: 50, carbs: 80, fat: 35 },
    { meal: "Dinner", dishes: [{name: "Salmon & Veggies"}], protein: 45, carbs: 65, fat: 30 },
    { meal: "Snacks", dishes: [{name: "Protein Shake"}, {name: "Apple"}], protein: 15, carbs: 25, fat: 10 },
  ],
  weekly: [
    { day: "Mon", date: "Apr 8", protein: 120, carbs: 200, fat: 80 },
    { day: "Tue", date: "Apr 9", protein: 110, carbs: 190, fat: 70 },
    { day: "Wed", date: "Apr 10", protein: 130, carbs: 210, fat: 90 },
    { day: "Thu", date: "Apr 11", protein: 100, carbs: 180, fat: 60 },
    { day: "Fri", date: "Apr 12", protein: 140, carbs: 220, fat: 85 },
    { day: "Sat", date: "Apr 13", protein: 150, carbs: 240, fat: 95 },
    { day: "Sun", date: "Apr 14", protein: 135, carbs: 215, fat: 75 },
  ],
  monthly: [
      { week: "Week 1", dateRange: "Apr 1 - Apr 7", protein: 855, carbs: 1455, fat: 555 },
      { week: "Week 2", dateRange: "Apr 8 - Apr 14", protein: 830, carbs: 1400, fat: 520 },
      { week: "Week 3", dateRange: "Apr 15 - Apr 21", protein: 880, carbs: 1500, fat: 580 },
      { week: "Week 4", dateRange: "Apr 22 - Apr 28", protein: 860, carbs: 1470, fat: 560 },
  ]
};

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

// Custom Tooltip for Daily view
const DailyChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    // Defensively check if dishes exist
    if (!data.dishes || data.dishes.length === 0) {
        // Fallback to default tooltip content if no dishes
        return <ChartTooltipContent active={active} payload={payload} label={label} />;
    }
    return (
      <div className="p-4 bg-background border rounded-lg shadow-lg">
        <p className="font-bold text-lg">{label}</p>
        <ul className="list-disc list-inside text-sm text-muted-foreground mt-2">
            {data.dishes.map((dish: any, index: number) => (
                <li key={index}>{dish.name}</li>
            ))}
        </ul>
      </div>
    );
  }

  return null;
};


export function NutritionChart({ dailyData }: { dailyData: DailyMacros[] }) {
  const [timeframe, setTimeframe] = React.useState<"daily" | "weekly" | "monthly">("daily")

  const { data, dataKey, description, showDishes } = React.useMemo(() => {
    switch (timeframe) {
      case "weekly":
        return { 
            data: MOCK_DATA.weekly, 
            dataKey: "day",
            description: "A summary of your weekly intake, day by day.",
            showDishes: false,
        }
      case "monthly":
        return { 
            data: MOCK_DATA.monthly, 
            dataKey: "week",
            description: "A summary of your monthly intake, week by week.",
            showDishes: false,
        }
      case "daily":
      default:
        const formattedDailyData = dailyData.map(d => ({
            meal: d.meal,
            protein: d.totals.protein,
            carbs: d.totals.carbs,
            fat: d.totals.fat,
            dishes: d.dishes,
        }));
        return { 
            data: formattedDailyData,
            dataKey: "meal",
            description: "A summary of your daily intake, meal by meal.",
            showDishes: true,
        }
    }
  }, [timeframe, dailyData]);

  const CustomTick = (props: any) => {
    const { x, y, payload } = props;
    const data = payload.payload;

    if (!data) {
        return null;
    }
    
    // The label for the tick (e.g., "Breakfast", "Mon", "Week 1")
    const tickLabel = data.meal || data.day || data.week;
    const subLabel = data.date || data.dateRange;

    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={16} textAnchor="middle" fill="#666" fontSize={14} fontWeight="bold">
          {tickLabel}
        </text>
        
        {subLabel && (
            <text x={0} y={16} dy={15} textAnchor="middle" fill="#888" fontSize={12}>
                {subLabel}
            </text>
        )}

        {showDishes && data.dishes && data.dishes.map((dish: any, index: number) => (
           <text key={index} x={0} y={16} dy={(index + 1) * 15} textAnchor="middle" fill="#888" fontSize={10}>
                {dish.name}
            </text>
        ))}
      </g>
    );
  };


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
          <BarChart data={data} margin={{ top: 20, right: 20, bottom: showDishes ? 60 : 40, left: 20 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey={dataKey}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={<CustomTick />}
              interval={0}
              height={showDishes ? 80 : 60}
            />
            <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => `${value}g`}
            />
            <ChartTooltipContainer content={<DailyChartTooltip />} cursor={{fill: 'hsl(var(--muted))'}}/>
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
