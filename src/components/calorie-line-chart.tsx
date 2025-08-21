
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

const CustomTick = (props: any) => {
    const { x, y, payload, data } = props;
    const tickValue = payload.value;

    const dataEntry = data.find((d: any) => d.time === tickValue);

    if (!dataEntry) {
        return null;
    }

    return (
        <foreignObject x={x - 50} y={y + 10} width={100} height={100}>
             <div className="text-center">
                <p className="text-sm font-bold">{dataEntry.meal}</p>
                {dataEntry.dishes.map((dish: any, index: number) => (
                    <p key={index} className="text-xs text-muted-foreground">{dish.name}</p>
                ))}
            </div>
        </foreignObject>
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
  
  const mealTicks = chartData.map(d => d.time);

  return (
    <>
    <ChartContainer config={chartConfig} className="w-full h-[200px]">
        <LineChart
            data={chartData}
            margin={{
            top: 20,
            right: 40,
            bottom: 80, 
            left: 20,
            }}
        >
            <CartesianGrid vertical={false} />
            <XAxis
                dataKey="time"
                type="number"
                domain={[todayStart, todayEnd]}
                scale="time"
                ticks={mealTicks}
                tick={<CustomTick data={chartData} />}
                interval={0}
                axisLine={false}
                tickLine={false}
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
                            if (!payload) return null;

                            const mealCalories = (payload.totals.protein * 4) + (payload.totals.carbs * 4) + (payload.totals.fat * 9);
                            const runningTotal = value;
                            const showDishBreakdown = payload.dishes.length > 1;

                            const calculateDishCalories = (dish: any) => {
                                return (dish.protein * 4) + (dish.carbs * 4) + (dish.fat * 9);
                            };

                            return (
                                <div className="text-sm">
                                    <p className="font-bold">{payload?.meal} ({format(payload?.loggedAt, "p")})</p>
                                    <p>{mealCalories.toFixed(0)} calories ({runningTotal.toFixed(0)} total)</p>
                                    <ul className="list-disc list-inside text-muted-foreground">
                                        {payload?.dishes?.map((dish: any) => (
                                            <li key={dish.name}>
                                                {dish.name}
                                                {showDishBreakdown && ` (${calculateDishCalories(dish).toFixed(0)} cal)`}
                                            </li>
                                        ))}
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