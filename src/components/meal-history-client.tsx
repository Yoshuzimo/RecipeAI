
"use client";

import { useState } from "react";
import type { DailyMacros } from "@/lib/types";
import { Card, CardContent } from "./ui/card";
import { EditMealTimeDialog } from "./edit-meal-time-dialog";
import { format, formatDistanceToNow, startOfDay, isSameDay } from "date-fns";
import { AlertCircle, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Button } from "./ui/button";
import { finalizeRecipe } from "@/ai/flows/finalize-recipe";
import { handleUpdateMealLog } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "./ui/separator";

const isMealOutdated = (meal: DailyMacros): boolean => {
    // A meal is outdated if any of its dishes are missing fiber or the detailed fats object.
    return meal.dishes.some(d => d.fiber === undefined || d.fats === undefined);
}

export function MealHistoryClient({ initialMeals }: { initialMeals: DailyMacros[] }) {
    const [meals, setMeals] = useState(initialMeals.sort((a, b) => b.loggedAt.getTime() - a.loggedAt.getTime()));
    const [selectedMeal, setSelectedMeal] = useState<DailyMacros | null>(null);
    const [updatingMeals, setUpdatingMeals] = useState<Record<string, boolean>>({});
    const { toast } = useToast();

    const handleMealUpdated = (updatedMeal: DailyMacros) => {
        setMeals(prevMeals => 
            prevMeals
                .map(m => m.id === updatedMeal.id ? updatedMeal : m)
                .sort((a, b) => b.loggedAt.getTime() - a.loggedAt.getTime())
        );
        setSelectedMeal(null);
    }
    
    const handleMealDeleted = (mealId: string) => {
        setMeals(prev => prev.filter(m => m.id !== mealId));
        setSelectedMeal(null);
    }

    const handleDishMoved = (updatedOriginalMeal?: DailyMacros, newMeal?: DailyMacros) => {
        setMeals(prevMeals => {
            let newMeals = [...prevMeals];
            if (updatedOriginalMeal) {
                // If original meal still has dishes, update it. Otherwise, remove it.
                if (updatedOriginalMeal.dishes.length > 0) {
                    newMeals = newMeals.map(m => m.id === updatedOriginalMeal.id ? updatedOriginalMeal : m);
                } else {
                    newMeals = newMeals.filter(m => m.id !== updatedOriginalMeal.id);
                }
            } else {
                 // The original meal might have been deleted if the last dish was moved.
                 const originalId = newMeal?.id ? meals.find(m => m.dishes.some(d => d.name === newMeal.dishes[0].name))?.id : undefined;
                 if (originalId) {
                     newMeals = newMeals.filter(m => m.id !== originalId);
                 }
            }
            if (newMeal) {
                const existingMealIndex = newMeals.findIndex(m => m.id === newMeal.id);
                if (existingMealIndex > -1) {
                    newMeals[existingMealIndex] = newMeal;
                } else {
                    newMeals.push(newMeal);
                }
            }
            return newMeals.sort((a, b) => b.loggedAt.getTime() - a.loggedAt.getTime());
        });
        setSelectedMeal(null);
    };


    const handleBackfillNutrition = async (meal: DailyMacros) => {
        setUpdatingMeals(prev => ({ ...prev, [meal.id]: true }));
        try {
            // This is a simplification. A real app would need a way to get ingredients/instructions for a logged meal.
            // Here, we'll assume the dish name can be used as a title for a rough re-calculation.
            const result = await finalizeRecipe({
                title: meal.dishes.map(d => d.name).join(', '),
                ingredients: [], // This is a limitation of the current data model for logged meals.
                instructions: [],
            });

            if ('error' in result) {
                throw new Error(result.error);
            }
            
            const updatedDishes = meal.dishes.map(d => ({ ...d, ...result.macros }));
            
            const saveResult = await handleUpdateMealLog(meal.id, updatedDishes);


            if (saveResult.success && saveResult.updatedMeal) {
                 setMeals(prev => prev.map(m => m.id === meal.id ? saveResult.updatedMeal! : m));
                 toast({
                    title: "Nutrition Updated",
                    description: `Nutritional info for "${meal.meal}" has been updated.`,
                });
            } else {
                 throw new Error(saveResult.error || "Failed to save updated meal log.");
            }

        } catch (e) {
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: e instanceof Error ? e.message : "Could not update nutritional info.",
            });
        } finally {
            setUpdatingMeals(prev => ({ ...prev, [meal.id]: false }));
        }
    };
    
    const groupedMeals = meals.reduce<Record<string, DailyMacros[]>>((acc, meal) => {
        const dateKey = format(startOfDay(meal.loggedAt), 'yyyy-MM-dd');
        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(meal);
        return acc;
    }, {});

    const sortedDateKeys = Object.keys(groupedMeals).sort().reverse();
    
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
                        {sortedDateKeys.length > 0 ? sortedDateKeys.map(dateKey => (
                            <div key={dateKey}>
                                <h2 className="font-bold text-xl p-4 bg-muted/50 border-b border-t">
                                    {format(new Date(dateKey), 'PPP')}
                                </h2>
                                {groupedMeals[dateKey].map(meal => {
                                    const outdated = isMealOutdated(meal);
                                    const isUpdating = updatingMeals[meal.id];
        
                                    return (
                                        <div 
                                            key={meal.id} 
                                            className="p-4 border-b last:border-b-0 cursor-pointer hover:bg-muted/50"
                                            onClick={() => setSelectedMeal(meal)}
                                        >
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-semibold text-lg hover:text-primary">
                                                            {meal.meal}
                                                        </p>
                                                        {outdated && !isUpdating && (
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger>
                                                                        <AlertCircle className="h-4 w-4 text-amber-500" />
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Missing detailed nutrition info.</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {meal.dishes.map(d => d.name).join(', ')}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <div className="text-right text-sm text-muted-foreground">
                                                        <p>{format(meal.loggedAt, "p")}</p>
                                                        <p>({formatDistanceToNow(meal.loggedAt, { addSuffix: true })})</p>
                                                    </div>
                                                    {outdated && (
                                                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleBackfillNutrition(meal) }} disabled={isUpdating}>
                                                            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Nutrition"}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )) : (
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
                onMealDeleted={handleMealDeleted}
                onDishMoved={handleDishMoved}
            />
        )}
        </>
    )
}
