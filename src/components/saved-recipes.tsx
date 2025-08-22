

"use client";

import { useState, useEffect } from "react";
import { Bookmark } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import type { Recipe } from "@/lib/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Badge } from "./ui/badge";
import { finalizeRecipe } from "@/ai/flows/finalize-recipe";
import { handleSaveRecipe } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "./ui/skeleton";

export function SavedRecipes({ initialRecipes }: { initialRecipes: Recipe[] }) {
  const [recipes, setRecipes] = useState(initialRecipes);
  const [recipesLoading, setRecipesLoading] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    const backfillCalories = async () => {
      for (const recipe of recipes) {
        if (recipe.macros && typeof recipe.macros.calories === 'undefined') {
          setRecipesLoading(prev => ({...prev, [recipe.title]: true}));
          try {
            const result = await finalizeRecipe({
              title: recipe.title,
              ingredients: recipe.ingredients,
              instructions: recipe.instructions,
            });

            if ('servings' in result) {
              const updatedRecipe = { ...recipe, macros: result.macros, servings: result.servings };
              await handleSaveRecipe(updatedRecipe);
              
              setRecipes(prev => prev.map(r => r.title === updatedRecipe.title ? updatedRecipe : r));
              toast({
                  title: "Recipe Updated",
                  description: `Nutritional info for "${recipe.title}" has been updated.`,
              });
            }
          } catch(e) {
            console.error("Failed to backfill calories for recipe:", recipe.title, e);
          } finally {
             setRecipesLoading(prev => ({...prev, [recipe.title]: false}));
          }
        }
      }
    };
    backfillCalories();
  }, []); // Run only once on mount

  return (
    <div className="space-y-8">
        <div className="flex items-center justify-between space-y-2">
            <div>
            <h1 className="text-3xl font-bold tracking-tight">Saved Recipes</h1>
            <p className="text-muted-foreground">
                Your collection of favorite and custom recipes.
            </p>
            </div>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle>My Recipe Book</CardTitle>
                <CardDescription>
                    Here you can find all the recipes you've saved from AI suggestions or created yourself.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {recipes.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full space-y-4">
                        {recipes.map((recipe, index) => (
                            <Card key={`${recipe.title}-${index}`} className="relative">
                               <Bookmark className="absolute top-4 right-4 h-5 w-5 fill-primary text-primary" />
                                <AccordionItem value={`item-${index}`} className="border-b-0">
                                    <CardHeader>
                                        <AccordionTrigger className="pr-10">
                                            <div>
                                                <h3 className="text-lg font-semibold text-left">{recipe.title}</h3>
                                                <p className="text-sm text-muted-foreground mt-1 text-left">{recipe.description}</p>
                                            </div>
                                        </AccordionTrigger>
                                    </CardHeader>
                                    <AccordionContent className="px-6 pb-6">
                                        {recipesLoading[recipe.title] ? (
                                            <div className="space-y-4">
                                                <Skeleton className="h-6 w-1/4" />
                                                <Skeleton className="h-20 w-full" />
                                                <Skeleton className="h-24 w-full" />
                                                <Skeleton className="h-8 w-1/2" />
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                <div>
                                                    <h4 className="font-semibold mb-2">Servings: {recipe.servings}</h4>
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold mb-2">Ingredients</h4>
                                                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                                        {recipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
                                                    </ul>
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold mb-2">Instructions</h4>
                                                    <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                                                        {recipe.instructions.map((step, i) => <li key={i}>{step}</li>)}
                                                    </ol>
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold mb-2">Macros (per serving)</h4>
                                                    <div className="flex gap-2 flex-wrap">
                                                        {recipe.macros.calories && <Badge variant="outline">Calories: {recipe.macros.calories.toFixed(0)}</Badge>}
                                                        <Badge variant="outline">Protein: {recipe.macros.protein.toFixed(0)}g</Badge>
                                                        <Badge variant="outline">Carbs: {recipe.macros.carbs.toFixed(0)}g</Badge>
                                                        <Badge variant="outline">Fat: {recipe.macros.fat.toFixed(0)}g</Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </AccordionContent>
                                </AccordionItem>
                            </Card>
                        ))}
                    </Accordion>
                ) : (
                    <div className="text-center py-20 border-2 border-dashed rounded-lg">
                        <Bookmark className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">No saved recipes yet</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Go to the Meal Planner to save your first recipe!
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
