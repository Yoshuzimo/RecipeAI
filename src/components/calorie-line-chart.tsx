
"use client"

import * as React from "react"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ReferenceLine, Tooltip } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { DailyMacros } from "@/lib/types"

type ChartDataPoint = {
    label: string; // e.g., "Breakfast", "Mon", "Week 1"
    calories: number;
    subLabels?: string[]; // e.g., dish names, date
};

const chartConfig = {
  calories: {
    label: "Calories",
    color: "hsl(var(--primary))",
  },
  goal: {
      label: "Goal",
  }
}

export function CalorieLineChart({ 
    data, 
    goal,
    timeframe 
}: { 
    data: any[], 
    goal?: number, 
    timeframe: "daily" | "weekly" | "monthly"
}) {

  const chartData = React.useMemo(() => {
    if (timeframe === 'daily') {
        let runningTotal = 0;
        return data.map(d => {
            const mealCalories = (d.totals.protein * 4) + (d.totals.carbs * 4) + (d.totals.fat * 9);
            runningTotal += mealCalories;
            return {
                label: d.meal,
                calories: runningTotal,
                subLabels: d.dishes.map((dish: any) => dish.name),
            }
        });
    }
    
    // For weekly and monthly, it's not a running total
    return data.map(d => {
        let subLabels: string[] = [];
        let label = "";
        if (timeframe === 'weekly') {
            label = d.day;
            subLabels = [d.date];
        } else { // monthly
            label = d.week;
            subLabels = [d.dateRange];
        }

        return {
            label,
            calories: d.calories,
            subLabels,
        }
    })
  }, [data, timeframe]);

  const CustomTick = (props: any) => {
    const { x, y, payload } = props;
    const label = payload.value;
    const dataEntry = chartData.find(d => d.label === label);
    
    if (!dataEntry) return null;

    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={16} textAnchor="middle" fill="#666" fontSize={12} fontWeight="bold">
          {dataEntry.label}
        </text>
        {dataEntry.subLabels?.map((subLabel, index) => (
           <text key={index} x={0} y={20} dy={(index + 1) * 12} textAnchor="middle" fill="#888" fontSize={10}>
                {subLabel}
            </text>
        ))}
      </g>
    );
  };

  return (
    <ChartContainer config={chartConfig} className="w-full h-[200px]">
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
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={<CustomTick />}
                interval={0}
                height={60}
            />
            <YAxis
                domain={[0, 3000]}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => `${value}`}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} cursor={{fill: 'hsl(var(--muted))'}} />
            {goal && <ReferenceLine y={goal} label="Goal" stroke="red" strokeDasharray="3 3" />}
            <Line
                dataKey="calories"
                type="monotone"
                stroke="var(--color-calories)"
                strokeWidth={2}
                dot={{
                    fill: "var(--color-calories)",
                }}
                activeDot={{
                    r: 6,
                }}
            />
        </LineChart>
    </ChartContainer>
  )
}
