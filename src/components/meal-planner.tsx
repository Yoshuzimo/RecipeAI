
"use client";

import React, { useState, useTransition, useRef } from "react";
import { handleGenerateSuggestions } from "@/app/actions";
import type { InventoryItem, Recipe, InventoryItemGroup } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, ChefHat, Bookmark, Minus, Plus, TriangleAlert, PlusCircle, Edit } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Badge } from "./ui/badge";
import { useToast } from "@/hooks/use-toast";
import { SubstitutionsDialog } from "./substitutions-dialog";
import { Textarea } from "./ui/textarea";
import { CheckExpiredDialog } from "./check-expired-dialog";
import { ViewInventoryItemDialog } from "./view-inventory-item-dialog";
import { getInventory } from "@/lib/data";
import { useRateLimiter } from "@/hooks/use-rate-limiter.tsx";
import { LogMealDialog } from "./log-meal-dialog";
import { Separator } from "./ui/separator";
import { CreateRecipeDialog } from "./create-recipe-dialog";


const initialState = {
  suggestions: null,
  adjustedRecipe: null,
  originalRecipeTitle: null,
  error: null,
  debugInfo: {
    promptInput: "AI prompt will appear here...",
    rawResponse: "Raw AI response will appear here...",
  },
};

const highRiskKeywords = ["chicken", "beef", "pork", "fish", "salmon", "shrimp", "turkey", "meat", "dairy", "milk", "cheese", "yogurt", "egg"];

export function MealPlanner({ initialInventory }: { initialInventory: InventoryItem[] }) {
  const { toast } = useToast();
  const { isRateLimited, timeToWait, checkRateLimit, recordRequest } = useRateLimiter();
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  
  const [suggestions, setSuggestions] = useState<Recipe[] | null>(null);
  const [error, setError] = useState<any | null>(null);
  const [debugInfo, setDebugInfo] = useState(initialState.debugInfo);
  const [isPending, startTransition] = useTransition();

  const formRef = useRef<HTMLFormElement>(null);
  
  const [isSubstitutionsDialogOpen, setIsSubstitutionsDialogOpen] = useState(false);
  const [recipeForSubstitutions, setRecipeForSubstitutions] = useState<Recipe | null>(null);
  
  const [isExpiredCheckDialogOpen, setIsExpiredCheckDialogOpen] = useState(false);
  const [ingredientToCheck, setIngredientToCheck] = useState<{recipe: Recipe, ingredient: string} | null>(null);

  const [isViewInventoryDialogOpen, setIsViewInventoryDialogOpen] = useState(false);
  const [groupToView, setGroupToView] = useState<InventoryItemGroup | null>(null);

  const [isLogMealDialogOpen, setIsLogMealDialogOpen] = useState(false);
  const [recipeToLog, setRecipeToLog] = useState<Recipe | null>(null);

  const [isCreateRecipeDialogOpen, setIsCreateRecipeDialogOpen] = useState(false);


  const handleSubmit = (formData: FormData) => {
    if (!checkRateLimit()) {
      return;
    }

    startTransition(async () => {
      recordRequest();
      // Ensure inventory is in a hidden field to be sent with the form
      const currentInventoryJSON = JSON.stringify(inventory);
      formData.set('inventory', currentInventoryJSON);

      const result = await handleGenerateSuggestions(formData);
      setError(result.error);
      if (result.debugInfo) {
          setDebugInfo(result.debugInfo);
      }
      
      if (result.suggestions) {
        setSuggestions(result.suggestions);
      }
      
      if (result.adjustedRecipe && result.originalRecipeTitle) {
        setSuggestions(prev => 
            prev?.map(s => s.title === result.originalRecipeTitle ? result.adjustedRecipe! : s) || null
        );
         toast({
            title: "Recipe Adjusted",
            description: `Servings for "${result.originalRecipeTitle}" updated.`,
        });
      }
    });
  };

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
      // Find any inventory item whose name is a substring of the ingredient string
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
  }

  const handleIngredientClick = (recipe: Recipe, ingredient: string) => {
      const status = getIngredientStatus(ingredient);
      if (status.startsWith('expired')) {
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
            // User says it's good, so take them to substitutions but don't pre-select anything
            handleOpenSubstitutions(ingredientToCheck.recipe);
          } else {
            // User says it's spoiled, open the inventory view to manage packages
            const inventoryItem = inventory.find(item => ingredientToCheck.ingredient.toLowerCase().includes(item.name.toLowerCase()));
            const ingredientName = inventoryItem?.name;
            if (ingredientName) {
                const items = inventory.filter(item => item.name === ingredientName);
                // Create a dummy group to pass to the dialog
                const group: InventoryItemGroup = {
                    name: ingredientName,
                    items: items,
                    packageInfo: '', // Not needed for this view
                    nextExpiry: items.length > 0 ? items.sort((a,b) => {
                        if (a.expiryDate === null) return 1;
                        if (b.expiryDate === null) return -1;
                        return a.expiryDate.getTime() - b.expiryDate.getTime()
                    })[0].expiryDate : null,
                    unit: items[0]?.unit || 'pcs'
                };
                setGroupToView(group);
                setIsViewInventoryDialogOpen(true);
            }
          }
      }
      // Don't reset ingredientToCheck here, we need it for the inventory dialog logic
  }

  const handleSubstitutionsApplied = (updatedRecipe: Recipe) => {
      setSuggestions(prev => 
        prev?.map(s => s.title === updatedRecipe.title ? updatedRecipe : s) || null
      );
      setRecipeForSubstitutions(null);
  }

  const handleInventoryUpdateAndCheckSubstitutions = async () => {
    const updatedInventory = await getInventory(); // Re-fetch inventory
    setInventory(updatedInventory);

    if (ingredientToCheck) {
        const { recipe, ingredient } = ingredientToCheck;
        const ingredientName = inventory.find(i => ingredient.toLowerCase().includes(i.name.toLowerCase()))?.name;
        
        // Check if the item still exists in inventory after update
        const itemStillExists = updatedInventory.some(i => i.name === ingredientName && i.totalQuantity > 0);
        
        if (!itemStillExists) {
            toast({
                title: "Item Removed",
                description: `${ingredientName} was removed from inventory. Opening substitutions.`,
            });
            // Item was fully removed, so force substitution
            handleOpenSubstitutions(recipe);
        } else {
            toast({
                title: "Inventory Updated",
                description: `Inventory for ${ingredientName} has been updated.`,
            })
        }
    }
    setIngredientToCheck(null); // Reset after handling
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


  return (
    <>
    <div className="space-y-8">
      <Card>
        <CardContent className="pt-6">
          <form ref={formRef} onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(new FormData(e.currentTarget));
            }} className="space-y-4">
             <input type="hidden" name="inventory" value={JSON.stringify(inventory)} />
            <div>
              <Label htmlFor="cravingsOrMood" className="sr-only">
                Any specific cravings or ideas? (Optional)
              </Label>
              <Input
                id="cravingsOrMood"
                name="cravingsOrMood"
                placeholder="Any cravings or ideas? (e.g., 'spicy thai curry', 'healthy snack')... (Optional)"
                className="mt-1"
                disabled={isPending || isRateLimited}
              />
            </div>
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
            {error?.form && (
                <p className="text-sm font-medium text-destructive mt-2">{error.form[0]}</p>
            )}
            {error?.fieldErrors && (
                <div className="text-sm font-medium text-destructive mt-2">
                    {Object.entries(error.fieldErrors).map(([key, value]) => (
                        <p key={key}>{`${key}: ${(value as string[]).join(', ')}`}</p>
                    ))}
                </div>
            )}
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {isPending ? (
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
                       <CardHeader className="p-6">
                            <div className="flex justify-between items-start group">
                                <AccordionTrigger asChild className="p-0 flex-1 text-left hover:no-underline">
                                    <div>
                                        <h3 className="text-lg font-semibold">{recipe.title}</h3>
                                        <p className="text-sm text-muted-foreground mt-1">{recipe.description}</p>
                                    </div>
                                </AccordionTrigger>
                                <Button variant="ghost" size="icon" className="group-hover:bg-accent/50 ml-4 shrink-0" onClick={(e) => { e.stopPropagation(); handleSaveRecipe(recipe); }}>
                                    <Bookmark className="h-5 w-5" />
                                    <span className="sr-only">Save Recipe</span>
                                </Button>
                            </div>
                        </CardHeader>
                        <AccordionContent className="px-6 pb-6">
                            <div className="space-y-6">
                                 <form onSubmit={(e) => {
                                      e.preventDefault();
                                      const formData = new FormData(e.currentTarget);
                                      const newServingSize = (e.nativeEvent.submitter as HTMLButtonElement).value;
                                      formData.set('newServingSize', newServingSize);
                                      handleSubmit(formData);
                                    }} className="flex items-center gap-4">
                                     <h4 className="font-semibold">Servings</h4>
                                     <div className="flex items-center gap-2">
                                        <Button
                                            type="submit"
                                            name="newServingSize"
                                            value={recipe.servings - 1}
                                            disabled={recipe.servings <= 1 || isPending || isRateLimited}
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
                                            disabled={isPending || isRateLimited}
                                            size="icon"
                                            variant="outline"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <input type="hidden" name="inventory" value={JSON.stringify(inventory)} />
                                    <input type="hidden" name="recipeToAdjust" value={JSON.stringify(recipe)} />
                                </form>

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
                                </div>
                                <Separator />
                                <div className="flex gap-2">
                                    <Button onClick={() => handleOpenSubstitutions(recipe)} variant="outline">
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit Recipe
                                    </Button>
                                    <Button onClick={() => handleCookItClick(recipe)}>
                                        <ChefHat className="mr-2 h-4 w-4" />
                                        Cook It!
                                    </Button>
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
            <Button variant="outline" className="mt-4" onClick={() => setIsCreateRecipeDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create a Meal
            </Button>
          </div>
        )}
      </div>

       <div className="mt-8 space-y-4">
        <h3 className="text-xl font-bold">Debug Info</h3>
        <div className="space-y-2">
          <Label htmlFor="prompt-input">Prompt Input</Label>
          <Textarea id="prompt-input" readOnly value={debugInfo.promptInput || ""} className="h-64 font-mono text-xs" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="raw-response">Raw AI Response</Label>
          <Textarea id="raw-response" readOnly value={debugInfo.rawResponse || ""} className="h-64 font-mono text-xs" />
        </div>
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
                // When dialog closes, refresh inventory and check if substitutions are needed
                handleInventoryUpdateAndCheckSubstitutions();
            }
            setIsViewInventoryDialogOpen(open);
          }}
          group={groupToView}
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
