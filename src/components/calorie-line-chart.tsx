
"use client"

import * as React from "react"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ReferenceLine, Tooltip, Dot } from "recharts"
import { format, startOfDay, endOfDay, setHours, setMinutes } from "date-fns"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { DailyMacros } from "@/lib/types"
import { EditMealTimeDialog } from "./edit-meal-time-dialog"

const chartConfig = {
  calories: {
    label: "Calories",
    color: "hsl(var(--primary))",
  },
  goal: {
      label: "Goal",
  }
}

const CustomDot = (props: any) => {
    const { cx, cy, payload, onDotClick } = props;

    // Prevents rendering dots for non-data points
    if (!payload.meal) {
        return null;
    }

    return (
        <Dot
            cx={cx}
            cy={cy}
            r={5}
            fill="var(--color-calories)"
            strokeWidth={2}
            onClick={() => onDotClick(payload)}
        />
    );
};

export function CalorieLineChart({ 
    data, 
    goal,
    timeframe,
    onDataChange,
}: { 
    data: DailyMacros[], 
    goal?: number, 
    timeframe: "daily" | "weekly" | "monthly",
    onDataChange: () => void;
}) {
  const [mealToEdit, setMealToEdit] = React.useState<DailyMacros | null>(null);

  const chartData = React.useMemo(() => {
    if (timeframe !== 'daily') {
        // For weekly/monthly, we can just map the data as before
        // This component is now primarily for daily view as requested.
        // Returning empty so it doesn't render for other timeframes.
        return [];
    }

    // Sort meals by time
    const sortedData = [...data].sort((a, b) => a.loggedAt.getTime() - b.loggedAt.getTime());
    
    let runningTotal = 0;
    return sortedData.map(d => {
        const mealCalories = (d.totals.protein * 4) + (d.totals.carbs * 4) + (d.totals.fat * 9);
        runningTotal += mealCalories;
        return {
            ...d, // Pass full meal data to payload
            calories: runningTotal,
            time: d.loggedAt.getTime(), // Use timestamp for x-axis
        }
    });
  }, [data, timeframe]);

  const handleDotClick = (payload: DailyMacros) => {
      setMealToEdit(payload);
  }

  const handleMealTimeUpdated = () => {
    onDataChange();
    setMealToEdit(null);
  }

  if (timeframe !== 'daily') {
    return null; // Don't render for weekly/monthly
  }
  
  const todayStart = startOfDay(new Date()).getTime();
  const todayEnd = endOfDay(new Date()).getTime();

  return (
    <>
    <ChartContainer config={chartConfig} className="w-full h-[200px]">
        <LineChart
            data={chartData}
            margin={{
            top: 20,
            right: 40,
            bottom: 20, 
            left: 20,
            }}
        >
            <CartesianGrid vertical={false} />
            <XAxis
                dataKey="time"
                type="number"
                domain={[todayStart, todayEnd]}
                tickFormatter={(time) => format(new Date(time), 'HH:mm')}
                scale="time"
                ticks={[
                    startOfDay(new Date()).getTime(),
                    setHours(startOfDay(new Date()), 6).getTime(),
                    setHours(startOfDay(new Date()), 12).getTime(),
                    setHours(startOfDay(new Date()), 18).getTime(),
                    endOfDay(new Date()).getTime(),
                ]}
            />
            <YAxis
                domain={[0, 3000]}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => `${value}`}
            />
            <ChartTooltip 
                content={
                    <ChartTooltipContent 
                        formatter={(value, name, props) => {
                            const { payload } = props;
                            return (
                                <div className="text-sm">
                                    <p className="font-bold">{payload?.meal} ({format(payload?.loggedAt, "p")})</p>
                                    <p>{value} kcal (running total)</p>
                                    <ul className="list-disc list-inside text-muted-foreground">
                                        {payload?.dishes?.map((d: any) => <li key={d.name}>{d.name}</li>)}
                                    </ul>
                                </div>
                            )
                        }}
                    />
                } 
                cursor={{strokeDasharray: '3 3'}}
            />
            {goal && <ReferenceLine y={goal} label={{ value: "Goal", position: 'insideTopLeft' }} stroke="red" strokeDasharray="3 3" />}
            <Line
                dataKey="calories"
                type="monotone"
                stroke="var(--color-calories)"
                strokeWidth={2}
                dot={<CustomDot onDotClick={handleDotClick} />}
                activeDot={{ r: 8, style: { cursor: 'pointer' } }}
            />
        </LineChart>
    </ChartContainer>

    {mealToEdit && (
        <EditMealTimeDialog
            isOpen={!!mealToEdit}
            setIsOpen={() => setMealToEdit(null)}
            meal={mealToEdit}
            onTimeUpdated={handleMealTimeUpdated}
        />
    )}
    </>
  )
}
