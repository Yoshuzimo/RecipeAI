"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"

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
} from "@/components/ui/chart"

const chartData = [
  { macro: "protein", eaten: 110, remaining: 70 },
  { macro: "carbs", eaten: 180, remaining: 120 },
  { macro: "fat", eaten: 60, remaining: 40 },
]

const chartConfig = {
  eaten: {
    label: "Eaten",
    color: "hsl(var(--primary))",
  },
  remaining: {
    label: "Remaining",
    color: "hsl(var(--primary) / 0.2)",
  },
}

export function TodaysMacros() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's Macros</CardTitle>
        <CardDescription>Your consumption vs. your daily goals.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
          <BarChart accessibilityLayer data={chartData} layout="vertical">
            <CartesianGrid horizontal={false} />
            <XAxis type="number" dataKey="value" hide />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="line"
                  labelKey="macro"
                  formatter={(value, name, item) => (
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="flex flex-1 justify-between">
                        <span>{item.name === "eaten" ? "Eaten" : "Remaining"}</span>
                        <span className="font-bold">{value}g</span>
                      </div>
                    </div>
                  )}
                />
              }
            />
            <Bar
                dataKey="eaten"
                stackId="a"
                fill="var(--color-eaten)"
                radius={[4, 0, 0, 4]}
              />
              <Bar
                dataKey="remaining"
                stackId="a"
                fill="var(--color-remaining)"
                radius={[0, 4, 4, 0]}
              />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
