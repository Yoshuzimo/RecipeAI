

"use client";

import React, { useState, useTransition, useMemo, useRef, useCallback } from "react";
import { handleGenerateSuggestions, handleSaveRecipe, handleGenerateRecipeDetails, getClientInventory } from "@/app/actions";
import type { InventoryItem, Recipe, InventoryItemGroup } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, ChefHat, PlusCircle } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { Accordion } from "./ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { SubstitutionsDialog } from "./substitutions-dialog";
import { CheckExpiredDialog } from "./check-expired-dialog";
import { ViewInventoryItemDialog } from "./view-inventory-item-dialog";
import { useRateLimiter } from "@/hooks/use-rate-limiter.tsx";
import { LogMealDialog } from "./log-meal-dialog";
import { CreateRecipeDialog } from "./create-recipe-dialog";
import { RecipeCard } from "./recipe-card";


const initialState = {
  suggestions: null,
  error: null,
};

const highRiskKeywords = ["chicken", "beef", "pork", "fish", "salmon", "shrimp", "turkey", "meat", "dairy", "milk", "cheese", "yogurt", "egg"];

export function MealPlanner({ initialInventory, initialSavedRecipes }: { initialInventory: InventoryItem[], initialSavedRecipes: Recipe[] }) {
  const { toast } = useToast();
  const { isRateLimited, timeToWait, checkRateLimit, recordRequest } = useRateLimiter();
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>(initialSavedRecipes);
  
  const [suggestions, setSuggestions] = useState<Recipe[] | null>(null);
  const [error, setError] = useState<any | null>(null);
  const [isPending, startTransition] = useTransition();
  const cravingsRef = useRef<HTMLInputElement>(null);
  
  const [isSubstitutionsDialogOpen, setIsSubstitutionsDialogOpen] = useState(false);
  const [recipeForSubstitutions, setRecipeForSubstitutions] = useState<Recipe | null>(null);
  
  const [isExpiredCheckDialogOpen, setIsExpiredCheckDialogOpen] = useState(false);
  const [ingredientToCheck, setIngredientToCheck] = useState<{recipe: Recipe, ingredient: string} | null>(null);

  const [isViewInventoryDialogOpen, setIsViewInventoryDialogOpen] = useState(false);
  const [groupToView, setGroupToView] = useState<InventoryItemGroup | null>(null);

  const [isLogMealDialogOpen, setIsLogMealDialogOpen] = useState(false);
  const [recipeToLog, setRecipeToLog] = useState<Recipe | null>(null);

  const [isCreateRecipeDialogOpen, setIsCreateRecipeDialogOpen] = useState(false);

  const savedRecipeTitles = useMemo(() => new Set(savedRecipes.map(r => r.title)), [savedRecipes]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!checkRateLimit()) {
      return;
    }
    
    console.log("Form submission intercepted. Preventing default POST.");
    setError(null);
    const cravings = cravingsRef.current?.value || "";

    startTransition(async () => {
        recordRequest();
        const formData = new FormData();
        formData.append("cravingsOrMood", cravings);
        formData.append('inventory', JSON.stringify(inventory));

        const result = await handleGenerateSuggestions(formData);
        setError(result.error);
        
        if (result.suggestions) {
            setSuggestions(result.suggestions);
        }
    });
  };

  const getIngredientStatus = useCallback((ingredient: string) => {
      if (!ingredient || typeof ingredient !== 'string') return 'fresh';
      const now = new Date();
      now.setHours(0,0,0,0);
      const inventoryItem = inventory.find(item => ingredient.toLowerCase().includes(item.name.toLowerCase()));
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
  }, [inventory]);

  const ingredientStatuses = useMemo(() => {
    if (!suggestions) return {};
    const statuses: Record<string, string> = {};
    suggestions.forEach(recipe => {
      recipe.ingredients.forEach(ing => {
        if (ing) { // Ensure ingredient is not null/undefined
            statuses[`${recipe.title}-${ing}`] = getIngredientStatus(ing);
        }
      });
    });
    return statuses;
  }, [suggestions, getIngredientStatus]);


  const handleIngredientClick = (recipe: Recipe, ingredient: string) => {
      const status = ingredientStatuses[`${recipe.title}-${ingredient}`];
      if (status && status.startsWith('expired')) {
          setIngredientToCheck({recipe, ingredient});
          setIsExpiredCheckDialogOpen(true);
      } else {
          handleOpenSubstitutions(recipe);
      }
  }

  const handleOpenSubstitutions = (recipe: Recipe) => {
      setRecipeForSubstitutions(recipe);
      setIsSubstitutionsDialogOpen(true);
  }
  
  const handleExpiredCheckComplete = (isGood: boolean) => {
      setIsExpiredCheckDialogOpen(false);
      if (ingredientToCheck) {
          if(isGood) {
            handleOpenSubstitutions(ingredientToCheck.recipe);
          } else {
            const inventoryItem = inventory.find(item => ingredientToCheck.ingredient.toLowerCase().includes(item.name.toLowerCase()));
            const ingredientName = inventoryItem?.name;
            if (ingredientName) {
                const items = inventory.filter(item => item.name === ingredientName);
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
                    locationName: '',
                };
                setGroupToView(group);
                setIsViewInventoryDialogOpen(true);
            }
          }
      }
  }

  const handleSubstitutionsApplied = async (originalRecipeTitle: string, newIngredients: string[]) => {
      const originalRecipe = suggestions?.find(s => s.title === originalRecipeTitle);
      if (!originalRecipe) return;

      const newRecipeData = {
          title: originalRecipe.title,
          description: originalRecipe.description,
          ingredients: newIngredients,
          instructions: originalRecipe.instructions,
      };

      startTransition(async () => {
        const result = await handleGenerateRecipeDetails(newRecipeData);
        if (result.recipe) {
            setSuggestions(prev => prev?.map(s => s.title === originalRecipeTitle ? result.recipe! : s) || null);
            toast({
                title: "Recipe Updated!",
                description: "Substitutions applied and nutrition info recalculated."
            });
        } else {
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: result.error
            });
        }
      });
  }

  const handleInventoryUpdateAndCheckSubstitutions = async () => {
    const { privateItems, sharedItems } = await getClientInventory();
    const newInventory = [...privateItems, ...sharedItems];
    setInventory(newInventory);

    if (ingredientToCheck) {
        const { recipe, ingredient } = ingredientToCheck;
        const ingredientName = inventory.find(i => ingredient.toLowerCase().includes(i.name.toLowerCase()))?.name;
        
        const itemStillExists = newInventory.some(i => i.name === ingredientName && i.totalQuantity > 0);
        
        if (!itemStillExists) {
            toast({
                title: "Item Removed",
                description: `${ingredientName} was removed from inventory. Opening substitutions.`,
            });
            handleOpenSubstitutions(recipe);
        } else {
            toast({
                title: "Inventory Updated",
                description: `Inventory for ${ingredientName} has been updated.`,
            })
        }
    }
    setIngredientToCheck(null);
    setGroupToView(null);
  };
  
  const handleCookItClick = (recipe: Recipe) => {
    setRecipeToLog(recipe);
    setIsLogMealDialogOpen(true);
  };

  const handleMealLogged = (newInventory: InventoryItem[]) => {
    setInventory(newInventory);
    toast({
        title: "Inventory Updated",
        description: "Your inventory has been updated with the new leftovers.",
    })
  }

  const handleRecipeCreated = (newRecipe: Recipe) => {
    setSuggestions(prev => [newRecipe, ...(prev || [])]);
  }

  const handleServingChange = (recipeTitle: string, newServingSize: number) => {
    startTransition(() => {
        setSuggestions(prevSuggestions => {
        if (!prevSuggestions) return null;

        return prevSuggestions.map(recipe => {
            if (recipe.title === recipeTitle) {
            if (newServingSize <= 0) return recipe;
            return {
                ...recipe,
                servings: newServingSize,
            };
            }
            return recipe;
        });
        });
    });
  };

  const handleSaveRecipeAction = async (recipe: Recipe) => {
    const result = await handleSaveRecipe(recipe);
    if (result.success) {
      toast({
        title: "Recipe Saved!",
        description: `"${recipe.title}" has been added to your saved recipes.`,
      });
      setSavedRecipes(prev => [...prev, recipe]);
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.error,
      });
    }
  };


  return (
    <>
    <div className="space-y-8">
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="cravingsOrMood">
                  Any specific cravings or ideas? (Optional)
                </Label>
                <Input
                  id="cravingsOrMood"
                  name="cravingsOrMood"
                  ref={cravingsRef}
                  placeholder="e.g., 'spicy thai curry', 'healthy snack'..."
                  className="mt-1"
                  disabled={isPending || isRateLimited}
                />
              </div>
              <div className="space-y-2">
                  <Button type="submit" disabled={isPending || isRateLimited} className="w-full sm:w-auto">
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : isRateLimited ? (
                      `Please wait (${timeToWait}s)`
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Suggestions
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                      AI can make mistakes. The results are based on the information you provide, not a healthcare professional. Always follow your doctor's advice.
                  </p>
              </div>
              {error?.form && (
                  <p className="text-sm font-medium text-destructive mt-2">{error.form[0]}</p>
              )}
            </div>
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
        ) : suggestions ? (
          <Accordion type="single" collapsible className="w-full space-y-4">
            {suggestions.map((recipe, index) => (
                <RecipeCard 
                    key={`${recipe.title}-${index}`}
                    recipe={recipe}
                    isSaved={savedRecipeTitles.has(recipe.title)}
                    ingredientStatuses={ingredientStatuses}
                    onSaveRecipe={handleSaveRecipeAction}
                    onServingChange={handleServingChange}
                    onIngredientClick={handleIngredientClick}
                    onOpenSubstitutions={handleOpenSubstitutions}
                    onCookIt={handleCookItClick}
                />
            ))}
          </Accordion>
        ) : (
          <div className="text-center py-10 border-2 border-dashed rounded-lg">
            <ChefHat className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">Ready for some recipes?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your preferences above to get some delicious meal ideas!
            </p>
            <Button variant="outline" className="mt-4" onClick={() => setIsCreateRecipeDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create a Meal
            </Button>
          </div>
        )}
      </div>
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
                handleInventoryUpdateAndCheckSubstitutions();
            }
            setIsViewInventoryDialogOpen(open);
          }}
          group={groupToView}
          isPrivate={groupToView.isPrivate}
          onUpdateComplete={handleInventoryUpdateAndCheckSubstitutions}
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
        inventory={inventory}
        onRecipeCreated={handleRecipeCreated}
      />
    </>
  );
}
