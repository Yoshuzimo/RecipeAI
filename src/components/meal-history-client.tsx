
"use client";

import { useState } from "react";
import type { DailyMacros } from "@/lib/types";
import { Card, CardContent } from "./ui/card";
import { EditMealTimeDialog } from "./edit-meal-time-dialog";
import { format, formatDistanceToNow } from "date-fns";
import { AlertCircle, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Button } from "./ui/button";
import { finalizeRecipe } from "@/ai/flows/finalize-recipe";
import { handleUpdateMealLog } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";

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
            
            const updatedMealLog: DailyMacros = {
                ...meal,
                dishes: meal.dishes.map(d => ({ ...d, ...result.macros })),
                totals: result.macros,
            };
            
            const saveResult = await handleUpdateMealLog(updatedMealLog);

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
                        {meals.map(meal => {
                            const outdated = isMealOutdated(meal);
                            const isUpdating = updatingMeals[meal.id];

                            return (
                                <div 
                                    key={meal.id} 
                                    className="p-4 border-b last:border-b-0"
                                >
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <p 
                                                    className="font-semibold text-lg hover:text-primary cursor-pointer"
                                                    onClick={() => setSelectedMeal(meal)}
                                                >
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
                                                <p>{format(meal.loggedAt, "PPP p")}</p>
                                                <p>({formatDistanceToNow(meal.loggedAt, { addSuffix: true })})</p>
                                            </div>
                                            {outdated && (
                                                <Button size="sm" variant="outline" onClick={() => handleBackfillNutrition(meal)} disabled={isUpdating}>
                                                    {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Nutrition"}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
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
