"use client";

import React from "react";
import { useFormStatus } from "react-dom";
import { handleGenerateSuggestions } from "@/app/actions";
import type { InventoryItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, ChefHat } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Badge } from "./ui/badge";

const initialState = {
  suggestions: null,
  error: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" />
          Generate Suggestions
        </>
      )}
    </Button>
  );
}

export function MealPlanner({ inventory }: { inventory: InventoryItem[] }) {
  const handleGenerateSuggestionsWithInventory = handleGenerateSuggestions.bind(null, inventory);
  const [state, formAction] = React.useActionState(handleGenerateSuggestionsWithInventory, initialState);

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>AI Meal Planner</CardTitle>
          <CardDescription>Get recipe suggestions based on your inventory, preferences, and daily nutritional needs.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div>
              <Label htmlFor="cravingsOrMood">
                Any specific cravings or ideas? (Optional)
              </Label>
              <Input
                id="cravingsOrMood"
                name="cravingsOrMood"
                placeholder="e.g., 'something quick and easy', 'spicy thai curry', 'a healthy snack'"
                className="mt-1"
              />
              {state?.error?.cravingsOrMood && (
                <p className="text-sm font-medium text-destructive mt-1">
                  {state.error.cravingsOrMood[0]}
                </p>
              )}
            </div>
            <SubmitButton />
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">AI Suggestions</h2>
        {useFormStatus().pending ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
               <Card key={i}>
                <CardHeader>
                   <Skeleton className="h-6 w-3/4" />
                   <Skeleton className="h-4 w-full mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Skeleton className="h-5 w-1/4" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-full" />
                    </div>
                     <Skeleton className="h-5 w-1/4" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-4/6" />
                         <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : state.suggestions ? (
          <Accordion type="single" collapsible className="w-full space-y-4">
            {state.suggestions.map((recipe, index) => (
               <Card key={index}>
                    <AccordionItem value={`item-${index}`} className="border-b-0">
                        <AccordionTrigger className="p-6 hover:no-underline">
                            <div className="text-left">
                                <h3 className="text-lg font-semibold">{recipe.title}</h3>
                                <p className="text-sm text-muted-foreground mt-1">{recipe.description}</p>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6">
                            <div className="space-y-6">
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
                                     <h4 className="font-semibold mb-2">Estimated Macros</h4>
                                     <div className="flex gap-4">
                                        <Badge variant="outline">Protein: {recipe.macros.protein}g</Badge>
                                        <Badge variant="outline">Carbs: {recipe.macros.carbs}g</Badge>
                                        <Badge variant="outline">Fat: {recipe.macros.fat}g</Badge>
                                     </div>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
               </Card>
            ))}
          </Accordion>
        ) : (
          <div className="text-center py-10 border-2 border-dashed rounded-lg">
            <ChefHat className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">Ready for some recipes?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your preferences above to get some delicious meal ideas!
            </p>
          </div>
        )}
        {state.error?.form && (
           <p className="text-sm font-medium text-destructive mt-2">{state.error.form}</p>
        )}
      </div>
    </div>
  );
}
