
"use client";

import { useState } from "react";
import type { DailyMacros } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { EditMealTimeDialog } from "./edit-meal-time-dialog";
import { format, formatDistanceToNow } from "date-fns";

export function MealHistoryClient({ initialMeals }: { initialMeals: DailyMacros[] }) {
    const [meals, setMeals] = useState(initialMeals.sort((a, b) => b.loggedAt.getTime() - a.loggedAt.getTime()));
    const [selectedMeal, setSelectedMeal] = useState<DailyMacros | null>(null);

    const handleMealUpdated = (updatedMeal: DailyMacros) => {
        setMeals(prevMeals => 
            prevMeals
                .map(m => m.id === updatedMeal.id ? updatedMeal : m)
                .sort((a, b) => b.loggedAt.getTime() - a.loggedAt.getTime())
        );
        setSelectedMeal(null);
    }
    
    return (
        <>
        <div className="space-y-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Meal History</h1>
                <p className="text-muted-foreground">
                    A log of all your past meals. Click on an entry to edit it.
                </p>
            </div>
            
            <Card>
                <CardContent className="p-0">
                    <div className="space-y-2">
                        {meals.map(meal => (
                            <div 
                                key={meal.id} 
                                className="p-4 border-b last:border-b-0 hover:bg-muted/50 cursor-pointer"
                                onClick={() => setSelectedMeal(meal)}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold text-lg">{meal.meal}</p>
                                        <div className="text-sm text-muted-foreground">
                                            {meal.dishes.map(d => d.name).join(', ')}
                                        </div>
                                    </div>
                                    <div className="text-right text-sm text-muted-foreground">
                                        <p>{format(meal.loggedAt, "PPP p")}</p>
                                        <p>({formatDistanceToNow(meal.loggedAt, { addSuffix: true })})</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                         {meals.length === 0 && (
                             <p className="text-center text-muted-foreground p-8">No meals logged yet.</p>
                         )}
                    </div>
                </CardContent>
            </Card>
        </div>

        {selectedMeal && (
            <EditMealTimeDialog
                isOpen={!!selectedMeal}
                setIsOpen={() => setSelectedMeal(null)}
                meal={selectedMeal}
                onMealUpdated={handleMealUpdated}
            />
        )}
        </>
    )
}
