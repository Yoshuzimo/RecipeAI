
"use client";

import React, { useEffect, useMemo, useRef, useState, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { handleGenerateSuggestions } from "@/app/actions";
import type { InventoryItem, Recipe } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, ChefHat, Bookmark, Minus, Plus, TriangleAlert } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Badge } from "./ui/badge";
import { useToast } from "@/hooks/use-toast";
import { SubstitutionsDialog } from "./substitutions-dialog";
import { Textarea } from "./ui/textarea";

const initialState = {
  suggestions: null,
  error: null,
  adjustedRecipe: null,
  originalRecipeTitle: null,
  debugInfo: null,
  inventory: [],
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

const highRiskKeywords = ["chicken", "beef", "pork", "fish", "salmon", "shrimp", "turkey", "meat", "dairy", "milk", "cheese", "yogurt", "egg"];

export function MealPlanner({ initialInventory }: { initialInventory: InventoryItem[] }) {
  const { toast } = useToast();
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  const handleGenerateSuggestionsWithInventory = handleGenerateSuggestions.bind(null, inventory);

  const [state, formAction] = useActionState(handleGenerateSuggestionsWithInventory, initialState);
  const [suggestions, setSuggestions] = useState<Recipe[] | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const servingsFormRef = useRef<HTMLFormElement>(null);

  // Debugging state
  const [promptInput, setPromptInput] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<string | null>(null);

  // Substitution state
  const [isSubstitutionsDialogOpen, setIsSubstitutionsDialogOpen] = useState(false);
  const [recipeForSubstitutions, setRecipeForSubstitutions] = useState<Recipe | null>(null);

  useEffect(() => {
    if (state.suggestions) {
        setSuggestions(state.suggestions);
    }
    if (state.inventory && state.inventory.length > 0) {
        setInventory(state.inventory);
    }
    if (state.adjustedRecipe && state.originalRecipeTitle) {
      setSuggestions(prev => 
        prev?.map(s => s.title === state.originalRecipeTitle ? state.adjustedRecipe! : s) || null
      );
    }
     if (state.debugInfo) {
      setPromptInput(state.debugInfo.promptInput);
      setRawResponse(state.debugInfo.rawResponse);
    } else {
      setPromptInput(null);
      setRawResponse(null);
    }
  }, [state]);

  const handleSaveRecipe = (recipe: Recipe) => {
    // In a real app, this would save to a database.
    console.log("Saving recipe:", recipe);
    toast({
      title: "Recipe Saved!",
      description: `"${recipe.title}" has been added to your saved recipes.`,
    });
  };

  const getIngredientStatus = (ingredient: string) => {
      const now = new Date();
      now.setHours(0,0,0,0);
      const inventoryItem = inventory.find(item => ingredient.toLowerCase().includes(item.name.toLowerCase()));
      if (inventoryItem) {
          const expiryDate = new Date(inventoryItem.expiryDate);
          expiryDate.setHours(0,0,0,0);
          if (expiryDate < now) {
              const isHighRisk = highRiskKeywords.some(keyword => inventoryItem.name.toLowerCase().includes(keyword));
              return isHighRisk ? 'expired-high-risk' : 'expired-low-risk';
          }
      }
      return 'fresh';
  }

  const handleOpenSubstitutions = (recipe: Recipe) => {
      setRecipeForSubstitutions(recipe);
      setIsSubstitutionsDialogOpen(true);
  }

  const handleSubstitutionsApplied = (updatedRecipe: Recipe) => {
      setSuggestions(prev => 
        prev?.map(s => s.title === updatedRecipe.title ? updatedRecipe : s) || null
      );
      setRecipeForSubstitutions(null);
  }


  return (
    <>
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardDescription>Get recipe suggestions based on your inventory, preferences, and daily nutritional needs.</CardDescription>
        </CardHeader>
        <CardContent>
          <form ref={formRef} action={formAction} className="space-y-4">
            <div>
              <Label htmlFor="cravingsOrMood" className="sr-only">
                Any specific cravings or ideas? (Optional)
              </Label>
              <Input
                id="cravingsOrMood"
                name="cravingsOrMood"
                placeholder="Any cravings or ideas? (e.g., 'spicy thai curry', 'healthy snack')... (Optional)"
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
        {useFormStatus().pending && !state.adjustedRecipe ? (
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
        ) : suggestions ? (
          <Accordion type="single" collapsible className="w-full space-y-4">
            {suggestions.map((recipe, index) => (
               <Card key={recipe.title}>
                    <AccordionItem value={`item-${index}`} className="border-b-0">
                        <AccordionTrigger className="p-6 hover:no-underline group">
                            <div className="text-left flex-1">
                                <h3 className="text-lg font-semibold">{recipe.title}</h3>
                                <p className="text-sm text-muted-foreground mt-1">{recipe.description}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="group-hover:bg-accent/50" onClick={(e) => { e.stopPropagation(); handleSaveRecipe(recipe); }}>
                                <Bookmark className="h-5 w-5" />
                                <span className="sr-only">Save Recipe</span>
                            </Button>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6">
                            <div className="space-y-6">
                                <form ref={servingsFormRef} action={formAction} className="flex items-center gap-4">
                                     <h4 className="font-semibold">Servings</h4>
                                     <div className="flex items-center gap-2">
                                        <Button
                                            type="submit"
                                            name="newServingSize"
                                            value={recipe.servings - 1}
                                            disabled={recipe.servings <= 1 || useFormStatus().pending}
                                            size="icon"
                                            variant="outline"
                                        >
                                            <Minus className="h-4 w-4" />
                                        </Button>
                                        <span className="font-bold text-lg w-8 text-center">{recipe.servings}</span>
                                        <Button
                                            type="submit"
                                            name="newServingSize"
                                            value={recipe.servings + 1}
                                            disabled={useFormStatus().pending}
                                            size="icon"
                                            variant="outline"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <input type="hidden" name="recipeToAdjust" value={JSON.stringify(recipe)} />
                                </form>
                                <div>
                                    <h4 className="font-semibold mb-2">Ingredients</h4>
                                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                        {recipe.ingredients.map((ing, i) => {
                                            const status = getIngredientStatus(ing);
                                            const isExpired = status.startsWith('expired');
                                            return (
                                                <li key={i} onClick={() => handleOpenSubstitutions(recipe)} className="cursor-pointer hover:text-primary">
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
                                        <Badge variant="outline">Protein: {recipe.macros.protein}g</Badge>
                                        <Badge variant="outline">Carbs: {recipe.macros.carbs}g</Badge>
                                        <Badge variant="outline">Fat: {recipe.macros.fat}g</Badge>
                                     </div>
                                </div>
                                <Button onClick={() => handleOpenSubstitutions(recipe)}>
                                    Make Substitutions
                                </Button>
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

       {promptInput && rawResponse && (
        <div className="mt-8 space-y-4">
          <h3 className="text-xl font-bold">Debug Info</h3>
          <div className="space-y-2">
            <Label htmlFor="prompt-input">Prompt Input</Label>
            <Textarea id="prompt-input" readOnly value={promptInput} className="h-64 font-mono text-xs" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="raw-response">Raw AI Response</Label>
            <Textarea id="raw-response" readOnly value={rawResponse} className="h-64 font-mono text-xs" />
          </div>
        </div>
      )}
    </div>
     {isSubstitutionsDialogOpen && recipeForSubstitutions && (
        <SubstitutionsDialog
            isOpen={isSubstitutionsDialogOpen}
            setIsOpen={setIsSubstitutionsDialogOpen}
            recipe={recipeForSubstitutions}
            inventory={inventory}
            onSubstitutionsApplied={handleSubstitutionsApplied}
        />
     )}
    </>
  );
}
