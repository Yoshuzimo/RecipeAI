
"use client"

import * as React from "react"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ReferenceLine, Tooltip, Dot, ResponsiveContainer } from "recharts"
import { format, startOfDay, endOfDay, addDays } from "date-fns"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { DailyMacros, Settings } from "@/lib/types"
import { EditMealTimeDialog } from "../edit-meal-time-dialog"
import { getUserDayBoundaries } from "@/lib/utils"
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip"

type ChartDataPoint = {
    time: number; // Daily
    calories: number; // Daily
    day?: string; // Weekly/Monthly
    meal?: string;
    dishes?: any[];
    loggedAt?: Date;
    totals?: any;
    id?: string;
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

const CustomDot = (props: any) => {
    const { cx, cy, payload, onDotClick, timeframe } = props;

    if (!payload.meal || payload.calories === 0) {
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
            style={{ cursor: 'pointer' }}
        />
    );
};

const DailyCustomTick = (props: any) => {
    const { x, y, payload, data } = props;
    const tickValue = payload.value;
    const dataEntry = data.find((d: any) => d.time === tickValue);

    if (!dataEntry || !dataEntry.meal) {
        return null;
    }
    
    const dishText = dataEntry.dishes.map((d: any) => d.name).join(', ');
    const truncatedText = dishText.length > 20 ? `${dishText.substring(0, 20)}...` : dishText;

    return (
        <foreignObject x={x - 50} y={y + 10} width={100} height={100}>
             <div className="text-center">
                <p className="text-sm font-bold">{dataEntry.meal}</p>
                <TooltipProvider>
                    <UITooltip>
                        <TooltipTrigger asChild>
                           <p className="text-xs text-muted-foreground cursor-pointer">{truncatedText}</p>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{dishText}</p>
                        </TooltipContent>
                    </UITooltip>
                </TooltipProvider>
            </div>
        </foreignObject>
    );
};


export function CalorieLineChart({ 
    data, 
    goal,
    settings,
    timeframe,
    onMealUpdated,
    onMealDeleted,
    onDishMoved,
}: { 
    data: any[],
    goal?: number, 
    settings: Settings | null,
    timeframe: "daily" | "weekly" | "monthly",
    onMealUpdated: (updatedMeal: DailyMacros) => void,
    onMealDeleted: (mealId: string) => void,
    onDishMoved: (updatedOriginalMeal?: DailyMacros, newMeal?: DailyMacros) => void,
}) {
  const [mealToEdit, setMealToEdit] = React.useState<any | null>(null);

  const chartData: ChartDataPoint[] = React.useMemo(() => {
    if (timeframe === 'daily') {
        const sortedData = [...data].sort((a, b) => a.loggedAt.getTime() - b.loggedAt.getTime());
        let runningTotal = 0;
        return sortedData.map(d => {
             const mealCalories = (d.totals?.protein * 4 || 0) + (d.totals?.carbs * 4 || 0) + (d.totals?.fat * 9 || 0);
            if (d.dishes.length > 0) {
                runningTotal += mealCalories;
            }
            return {
                ...d,
                calories: runningTotal,
                time: d.loggedAt.getTime(),
            }
        });
    }
    if (timeframe === 'weekly' || timeframe === 'monthly') {
      return data.map(d => ({
        day: d.day,
        calories: d.calories,
        time: 0 // Not used for weekly/monthly
      }));
    }
    return [];
  }, [data, timeframe]);

  const handleDotClick = (payload: any) => {
      setMealToEdit(payload);
  }
  
  const { start: dayStart, end: dayEnd } = React.useMemo(() => {
    return getUserDayBoundaries(new Date(), settings?.dayStartTime || "00:00");
  }, [settings?.dayStartTime]);

  
  const mealTicks = timeframe === 'daily' ? chartData.filter(d => d.dishes.length > 0).map(d => d.time) : [];

  return (
    <>
    <ChartContainer config={chartConfig} className="w-full h-[250px] sm:h-[200px]">
        <ResponsiveContainer>
        <LineChart
            data={chartData}
            margin={{
                top: 20,
                right: 40,
                bottom: timeframe === 'daily' ? 80 : 20,
                left: 20,
            }}
        >
            <CartesianGrid vertical={false} />
             {timeframe === 'daily' ? (
                <XAxis
                    dataKey="time"
                    type="number"
                    domain={[dayStart.getTime(), dayEnd.getTime()]}
                    scale="time"
                    ticks={mealTicks}
                    tick={<DailyCustomTick data={chartData} />}
                    interval={0}
                    axisLine={false}
                    tickLine={false}
                />
            ) : (
                <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    interval={'preserveStartEnd'}
                />
            )}
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

                            if (payload.calories === 0) return null;

                            if (timeframe === 'daily') {
                                const mealCalories = (payload.totals.protein * 4) + (payload.totals.carbs * 4) + (payload.totals.fat * 9);
                                const runningTotal = value;
                                
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
                                                    {payload.dishes.length > 1 && ` (${calculateDishCalories(dish).toFixed(0)} cal)`}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )
                            }
                            
                            return (
                                <div className="text-sm">
                                    <p className="font-bold">{payload.day}</p>
                                    <p>{payload.calories.toFixed(0)} calories</p>
                                </div>
                            );
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
                dot={<CustomDot onDotClick={handleDotClick} timeframe={timeframe} />}
                activeDot={{ r: 8, style: { cursor: 'pointer' } }}
            />
        </LineChart>
        </ResponsiveContainer>
    </ChartContainer>

    {mealToEdit && (
        <EditMealTimeDialog
            isOpen={!!mealToEdit}
            setIsOpen={() => setMealToEdit(null)}
            meal={mealToEdit}
            onMealUpdated={onMealUpdated}
            onMealDeleted={onMealDeleted}
            onDishMoved={onDishMoved}
        />
    )}
    </>
  )
}
