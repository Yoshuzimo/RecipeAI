
"use client";

import React, { useState, useTransition, useRef, useMemo } from "react";
import { handleSaveRecipe, getClientInventory, getClientPersonalDetails, getClientTodaysMacros } from "@/app/actions";
import type { InventoryItem, Recipe, InventoryItemGroup, Substitution, PersonalDetails, DailyMacros } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, ChefHat, Bookmark, Minus, Plus, TriangleAlert, PlusCircle, Edit } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Badge } from "./ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckExpiredDialog } from "./check-expired-dialog";
import { ViewInventoryItemDialog } from "./view-inventory-item-dialog";
import { useRateLimiter } from "@/hooks/use-rate-limiter.tsx";
import { LogMealDialog } from "./log-meal-dialog";
import { Separator } from "./ui/separator";
import { CreateRecipeDialog } from "./create-recipe-dialog";
import { cn } from "@/lib/utils";
import { parseIngredient, scaleIngredients } from "@/lib/utils";


const highRiskKeywords = ["chicken", "beef", "pork", "fish", "salmon", "shrimp", "turkey", "meat", "dairy", "milk", "cheese", "yogurt", "egg"];

export function MealPlanner({ initialInventory, initialSavedRecipes }: { initialInventory: { privateItems: InventoryItem[], sharedItems: InventoryItem[] }, initialSavedRecipes: Recipe[] }) {
  const { toast } = useToast();
  const { isRateLimited, timeToWait, checkRateLimit, recordRequest } = useRateLimiter();
  const [inventory, setInventory] = useState<{ privateItems: InventoryItem[], sharedItems: InventoryItem[] }>(initialInventory);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>(initialSavedRecipes);
  
  const [suggestions, setSuggestions] = useState<Recipe[] | null>(null);
  const [error, setError] = useState<any | null>(null);
  const [isPending, startTransition] = useTransition();

  const cravingsRef = useRef<HTMLInputElement>(null);
  
  const [isExpiredCheckDialogOpen, setIsExpiredCheckDialogOpen] = useState(false);
  const [ingredientToCheck, setIngredientToCheck] = useState<{recipe: Recipe, ingredient: string} | null>(null);

  const [isViewInventoryDialogOpen, setIsViewInventoryDialogOpen] = useState(false);
  const [groupToView, setGroupToView] = useState<InventoryItemGroup | null>(null);

  const [isLogMealDialogOpen, setIsLogMealDialogOpen] = useState(false);
  const [recipeToLog, setRecipeToLog] = useState<Recipe | null>(null);

  const [isCreateRecipeDialogOpen, setIsCreateRecipeDialogOpen] = useState(false);

  const savedRecipeTitles = useMemo(() => new Set(savedRecipes.map(r => r.title)), [savedRecipes]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast({
        variant: "destructive",
        title: "AI Not Connected",
        description: "The AI suggestion feature has been disconnected.",
    });
  };

  const saveRecipeAction = async (recipe: Recipe) => {
    const result = await handleSaveRecipe(recipe);
    if (result.success) {
      toast({
        title: "Recipe Saved!",
        description: `"${recipe.title}" has been added to your saved recipes.`,
      });
      // Add to local state to update UI instantly
      setSavedRecipes(prev => [...prev, recipe]);
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.error,
      });
    }
  };

  const getIngredientStatus = (ingredient: string) => {
      const allItems = [...inventory.privateItems, ...inventory.sharedItems];
      const now = new Date();
      now.setHours(0,0,0,0);
      const inventoryItem = allItems.find(item => ingredient.toLowerCase().includes(item.name.toLowerCase()));
      if (inventoryItem) {
          if (!inventoryItem.expiryDate) return 'fresh';
          const expiryDate = new Date(inventoryItem.expiryDate);
          expiryDate.setHours(0,0,0,0);
          if (expiryDate < now) {
              const isHighRisk = highRiskKeywords.some(keyword => inventoryItem.name.toLowerCase().includes(keyword));
              return isHighRisk ? 'expired-high-risk' : 'expired-low-risk';
          }
      }
      return 'fresh';
  }

  const handleIngredientClick = (recipe: Recipe, ingredient: string) => {
      const status = getIngredientStatus(ingredient);
      if (status.startsWith('expired')) {
          setIngredientToCheck({recipe, ingredient});
          setIsExpiredCheckDialogOpen(true);
      }
  }
  
  const handleExpiredCheckComplete = (isGood: boolean) => {
      setIsExpiredCheckDialogOpen(false);
      const allItems = [...inventory.privateItems, ...inventory.sharedItems];
      if (ingredientToCheck) {
          if(!isGood) {
            const inventoryItem = allItems.find(item => ingredientToCheck.ingredient.toLowerCase().includes(item.name.toLowerCase()));
            const ingredientName = inventoryItem?.name;
            if (ingredientName) {
                const items = allItems.filter(item => item.name === ingredientName);
                const group: InventoryItemGroup = {
                    name: ingredientName,
                    items: items,
                    packageInfo: '',
                    nextExpiry: items.length > 0 ? items.sort((a,b) => {
                        if (a.expiryDate === null) return 1;
                        if (b.expiryDate === null) return -1;
                        return a.expiryDate.getTime() - b.expiryDate.getTime()
                    })[0].expiryDate : null,
                    unit: items[0]?.unit || 'pcs',
                    isPrivate: items[0]?.isPrivate,
                    locationId: items[0]?.locationId,
                    locationName: '', // This isn't critical for the dialog
                };
                setGroupToView(group);
                setIsViewInventoryDialogOpen(true);
            }
          }
      }
  }

  const handleInventoryUpdateAndCheck = async () => {
    const updatedInventory = await getClientInventory();
    setInventory(updatedInventory);
  };
  
  const handleCookItClick = (recipe: Recipe) => {
    toast({
        variant: "destructive",
        title: "AI Not Connected",
        description: "The meal logging feature has been disconnected.",
    });
  };

  const handleMealLogged = (newInventoryItems: InventoryItem[]) => {
    // This function assumes the new inventory list is complete (private + shared)
    // We need to re-group it. For now, we'll just set it.
    // This might need adjustment based on what `handleLogCookedMeal` returns.
    // For simplicity, let's assume it returns all items and we need to re-fetch.
    async function refreshInventory() {
        const fullInventory = await getClientInventory();
        setInventory(fullInventory);
    }
    refreshInventory();
  }

  const handleRecipeCreated = (newRecipe: Recipe) => {
    setSuggestions(prev => [newRecipe, ...(prev || [])]);
  }

  const handleServingChange = (recipeTitle: string, newServingSize: number) => {
    setSuggestions(prevSuggestions => {
      if (!prevSuggestions) return null;

      return prevSuggestions.map(recipe => {
        if (recipe.title === recipeTitle) {
          if (newServingSize <= 0) return recipe;

          const newIngredients = scaleIngredients(recipe.ingredients, recipe.servings, newServingSize);
          
          return {
            ...recipe,
            servings: newServingSize,
            ingredients: newIngredients,
            parsedIngredients: newIngredients.map(ing => parseIngredient(ing))
          };
        }
        return recipe;
      });
    });
  };


  return (
    <>
    <div className="space-y-8">
      <Card>
          <CardHeader>
              <CardTitle>Meal Planner</CardTitle>
              <CardDescription>
                  Tell us what you're in the mood for, and we'll generate some ideas.
              </CardDescription>
          </CardHeader>
          <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid w-full items-center gap-1.5">
                      <Label htmlFor="cravings">Cravings, Mood, or Notes</Label>
                      <Input ref={cravingsRef} id="cravings" placeholder="e.g., something spicy, quick & easy, I'm craving chicken..." />
                  </div>
                  <Button type="submit" disabled={true} className="w-full sm:w-auto">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Meal Ideas
                  </Button>
              </form>
          </CardContent>
      </Card>


      <div className="space-y-4">
        {isPending && !suggestions ? (
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
        ) : suggestions && (
          <Accordion type="single" collapsible className="w-full space-y-4">
            {suggestions.map((recipe, index) => {
              const isSaved = savedRecipeTitles.has(recipe.title);
              return (
               <Card key={`${recipe.title}-${index}`}>
                    <AccordionItem value={`item-${index}`} className="border-b-0">
                        <CardHeader className="flex flex-row items-start justify-between p-6">
                            <AccordionTrigger className="flex-1 text-left p-0">
                              <div>
                                  <h3 className="text-lg font-semibold">{recipe.title}</h3>
                                  <p className="text-sm text-muted-foreground mt-1">{recipe.description}</p>
                              </div>
                            </AccordionTrigger>
                            <Button variant="ghost" size="icon" className="ml-4 shrink-0" onClick={(e) => { e.stopPropagation(); saveRecipeAction(recipe); }} disabled={isSaved}>
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
                                            onClick={() => handleServingChange(recipe.title, recipe.servings - 1)}
                                            disabled={recipe.servings <= 1}
                                            size="icon"
                                            variant="outline"
                                        >
                                            <Minus className="h-4 w-4" />
                                        </Button>
                                        <span className="font-bold text-lg w-8 text-center">{recipe.servings}</span>
                                        <Button
                                            onClick={() => handleServingChange(recipe.title, recipe.servings + 1)}
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
                                            const status = getIngredientStatus(ing);
                                            const isExpired = status.startsWith('expired');
                                            return (
                                                <li key={i} onClick={() => handleIngredientClick(recipe, ing)} className="cursor-pointer hover:text-primary">
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
                                     <p className="text-xs text-muted-foreground mt-2">(These are approximate)</p>
                                </div>
                                <Separator />
                                <div className="flex gap-2">
                                    <Button onClick={() => {}} variant="outline" disabled>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Make substitutions
                                    </Button>
                                    <Button onClick={() => handleCookItClick(recipe)} disabled>
                                        <ChefHat className="mr-2 h-4 w-4" />
                                        Cook It!
                                    </Button>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
               </Card>
            )})}
          </Accordion>
        )}
      </div>

       <div className="text-center py-10 border-2 border-dashed rounded-lg">
        <ChefHat className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">Ready to cook?</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a meal to get started.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => setIsCreateRecipeDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create a Meal
        </Button>
      </div>
    </div>
     {isExpiredCheckDialogOpen && ingredientToCheck && (
         <CheckExpiredDialog 
            isOpen={isExpiredCheckDialogOpen}
            onClose={() => setIsExpiredCheckDialogOpen(false)}
            onConfirm={handleExpiredCheckComplete}
            ingredientName={ingredientToCheck.ingredient}
         />
     )}
      {isViewInventoryDialogOpen && groupToView && (
        <ViewInventoryItemDialog
          isOpen={isViewInventoryDialogOpen}
          setIsOpen={(open) => {
            if (!open) {
                // When dialog closes, refresh inventory and check if substitutions are needed
                handleInventoryUpdateAndCheck();
            }
            setIsViewInventoryDialogOpen(open);
          }}
          group={groupToView}
          isPrivate={groupToView.isPrivate}
          onUpdateComplete={async () => {
              const fullInventory = await getClientInventory();
              setInventory(fullInventory);
              handleInventoryUpdateAndCheck();
          }}
        />
      )}
      {isLogMealDialogOpen && recipeToLog && (
        <LogMealDialog
            isOpen={isLogMealDialogOpen}
            setIsOpen={setIsLogMealDialogOpen}
            recipe={recipeToLog}
            onMealLogged={handleMealLogged}
        />
      )}
      <CreateRecipeDialog
        isOpen={isCreateRecipeDialogOpen}
        setIsOpen={setIsCreateRecipeDialogOpen}
        inventory={[...inventory.privateItems, ...inventory.sharedItems]}
        onRecipeCreated={handleRecipeCreated}
      />
    </>
  );
}

    