
"use client"

import * as React from "react"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ReferenceLine } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { DailyMacros } from "@/lib/types"

const chartConfig = {
  runningTotal: {
    label: "Calories",
    color: "hsl(var(--primary))",
  },
  goal: {
      label: "Goal",
  }
}

export function CalorieLineChart({ dailyData, dailyGoal }: { dailyData: DailyMacros[], dailyGoal: number }) {

  const chartData = React.useMemo(() => {
    let runningTotal = 0;
    return dailyData.map(d => {
        const mealCalories = (d.totals.protein * 4) + (d.totals.carbs * 4) + (d.totals.fat * 9);
        runningTotal += mealCalories;
        return {
            meal: d.meal,
            dishes: d.dishes,
            runningTotal,
        }
    });
  }, [dailyData]);

  const CustomTick = (props: any) => {
    const { x, y, payload } = props;
    const mealName = payload.value;
    const dataEntry = chartData.find(d => d.meal === mealName);
    
    if (!dataEntry) return null;

    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={16} textAnchor="middle" fill="#666" fontSize={12} fontWeight="bold">
          {mealName}
        </text>
        {dataEntry.dishes.map((dish, index) => (
           <text key={index} x={0} y={20} dy={(index + 1) * 12} textAnchor="middle" fill="#888" fontSize={10}>
                {dish.name}
            </text>
        ))}
      </g>
    );
  };

  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
        <LineChart
            data={chartData}
            margin={{
            top: 20,
            right: 20,
            bottom: 60, 
            left: 20,
            }}
        >
            <CartesianGrid vertical={false} />
            <XAxis
                dataKey="meal"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={<CustomTick />}
                interval={0}
                height={60}
            />
            <YAxis
                domain={[1000, 3000]}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => `${value}`}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} cursor={{fill: 'hsl(var(--muted))'}} />
            <ReferenceLine y={dailyGoal} label="Goal" stroke="red" strokeDasharray="3 3" />
            <Line
                dataKey="runningTotal"
                type="monotone"
                stroke="var(--color-runningTotal)"
                strokeWidth={2}
                dot={{
                    fill: "var(--color-runningTotal)",
                }}
                activeDot={{
                    r: 6,
                }}
            />
        </LineChart>
    </ChartContainer>
  )
}
