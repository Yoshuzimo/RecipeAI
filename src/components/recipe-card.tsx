
"use client";

import type { Recipe } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Bookmark, Minus, Plus, TriangleAlert, Edit, ChefHat } from "lucide-react";
import { AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { cn } from "@/lib/utils";
import { scaleIngredients, parseIngredient } from "@/lib/utils";
import { useMemo } from "react";

interface RecipeCardProps {
    recipe: Recipe;
    isSaved: boolean;
    ingredientStatuses: Record<string, string>;
    onSaveRecipe: (recipe: Recipe) => void;
    onServingChange: (title: string, servings: number) => void;
    onIngredientClick: (recipe: Recipe, ingredient: string) => void;
    onOpenSubstitutions: (recipe: Recipe) => void;
    onCookIt: (recipe: Recipe) => void;
}

export function RecipeCard({
    recipe,
    isSaved,
    ingredientStatuses,
    onSaveRecipe,
    onServingChange,
    onIngredientClick,
    onOpenSubstitutions,
    onCookIt
}: RecipeCardProps) {

    const displayedIngredients = useMemo(() => {
        const originalRecipe = { ...recipe };
        if (!originalRecipe.title.includes("(Adjusted for")) {
           return scaleIngredients(recipe.ingredients, recipe.servings, recipe.servings);
        }
        return recipe.ingredients;
    }, [recipe.servings, recipe.ingredients]);

    return (
        <Card>
            <AccordionItem value={recipe.title} className="border-b-0">
                <CardHeader className="flex flex-row items-start justify-between p-6">
                    <AccordionTrigger className="flex-1 text-left p-0">
                      <div>
                          <h3 className="text-lg font-semibold">{recipe.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{recipe.description}</p>
                      </div>
                    </AccordionTrigger>
                    <Button variant="ghost" size="icon" className="ml-4 shrink-0" onClick={(e) => { e.stopPropagation(); onSaveRecipe(recipe); }} disabled={isSaved}>
                        <Bookmark className={cn("h-5 w-5", isSaved && "fill-current text-primary")} />
                        <span className="sr-only">Save Recipe</span>
                    </Button>
                </CardHeader>
                <AccordionContent className="px-6 pb-6">
                    <div className="space-y-6">
                         <div className="flex items-center gap-4">
                             <h4 className="font-semibold">Servings</h4>
                             <div className="flex items-center gap-2">
                                <Button
                                    onClick={() => onServingChange(recipe.title, recipe.servings - 1)}
                                    disabled={recipe.servings <= 1}
                                    size="icon"
                                    variant="outline"
                                >
                                    <Minus className="h-4 w-4" />
                                </Button>
                                <span className="font-bold text-lg w-8 text-center">{recipe.servings}</span>
                                <Button
                                    onClick={() => onServingChange(recipe.title, recipe.servings + 1)}
                                    size="icon"
                                    variant="outline"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-semibold mb-2">Ingredients</h4>
                            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                {recipe.ingredients.map((ing, i) => {
                                    const status = ingredientStatuses[`${recipe.title}-${ing}`] || 'fresh';
                                    const isExpired = status.startsWith('expired');
                                    return (
                                        <li key={i} onClick={() => onIngredientClick(recipe, ing)} className="cursor-pointer hover:text-primary">
                                            <span className={status === 'expired-high-risk' ? 'text-red-600 font-bold' : status === 'expired-low-risk' ? 'text-yellow-600 font-bold' : ''}>
                                                {ing}
                                                {isExpired && <TriangleAlert className="inline-block ml-2 h-4 w-4" />}
                                            </span>
                                        </li>
                                    )
                                })}
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
                                <Badge variant="outline">Protein: {recipe.macros.protein.toFixed(1)}g</Badge>
                                <Badge variant="outline">Carbs: {recipe.macros.carbs.toFixed(1)}g</Badge>
                                <Badge variant="outline">Fat: {recipe.macros.fat.toFixed(1)}g</Badge>
                             </div>
                             <p className="text-xs text-muted-foreground mt-2">(These are approximate)</p>
                        </div>
                        <Separator />
                        <div className="flex gap-2">
                            <Button onClick={() => onOpenSubstitutions(recipe)} variant="outline">
                                <Edit className="mr-2 h-4 w-4" />
                                Make substitutions
                            </Button>
                            <Button onClick={() => onCookIt(recipe)}>
                                <ChefHat className="mr-2 h-4 w-4" />
                                Cook It!
                            </Button>
                        </div>
                    </div>
                </AccordionContent>
            </AccordionItem>
       </Card>
    )
}
