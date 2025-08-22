

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
import { differenceInDays, formatDistanceToNow } from "date-fns";


const highRiskKeywords = ["chicken", "beef", "pork", "fish", "salmon", "shrimp", "turkey", "meat", "dairy", "milk", "cheese", "yogurt", "egg"];

export function MealPlanner({ 
    initialInventory, 
    initialSavedRecipes,
    personalDetails,
    todaysMacros,
}: { 
    initialInventory: { privateItems: InventoryItem[], sharedItems: InventoryItem[] }, 
    initialSavedRecipes: Recipe[],
    personalDetails: PersonalDetails,
    todaysMacros: DailyMacros[],
}) {
  const { toast } = useToast();
  const { isRateLimited, timeToWait, checkRateLimit, recordRequest } = useRateLimiter();
  const [inventory, setInventory] = useState<{ privateItems: InventoryItem[], sharedItems: InventoryItem[] }>(initialInventory);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>(initialSavedRecipes);
  
  const [suggestions, setSuggestions] = useState<Recipe[] | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
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
    startTransition(() => {
        const allItems = [...inventory.privateItems, ...inventory.sharedItems];
        const now = new Date();

        const formatItems = (items: InventoryItem[]) => {
            if (items.length === 0) return 'None';
            return items.map(item => {
                const expiryInfo = item.expiryDate 
                    ? `(expires in ${formatDistanceToNow(item.expiryDate, { addSuffix: true })})`
                    : '';
                return `- ${item.name}: ${item.totalQuantity.toFixed(2)} ${item.unit} ${expiryInfo}`;
            }).join('\\n');
        };

        const expiringItems = allItems.filter(item => 
            item.expiryDate && differenceInDays(item.expiryDate, now) <= 3 && differenceInDays(item.expiryDate, now) >= 0
        );

        const leftovers = allItems.filter(item => item.name.toLowerCase().startsWith('leftover'));
        const regularInventory = allItems.filter(item => !expiringItems.includes(item) && !leftovers.includes(item));

        const prompt = `
You are an expert chef and nutritionist AI. Your task is to generate 3-5 creative and delicious meal recipes based on the user's available inventory, preferences, and health data.

**USER'S CONTEXT:**

*   **Cravings / Mood:** ${cravingsRef.current?.value || 'Not specified'}

*   **Inventory to Use First (Leftovers & Expiring Soon):**
    *   Leftovers:
        ${formatItems(leftovers)}
    *   Expiring Soon (use these urgently):
        ${formatItems(expiringItems)}

*   **Main Inventory:**
    ${formatItems(regularInventory)}

*   **Kitchen Equipment Available:**
    ${personalDetails.specializedEquipment || 'Standard kitchen equipment'}

*   **Health & Dietary Profile:**
    *   Health Goals: ${personalDetails.healthGoals || 'Not specified'}
    *   Dietary Restrictions: ${personalDetails.dietaryRestrictions || 'None'}
    *   Allergies: ${personalDetails.allergies || 'None'}
    *   Health Conditions: ${personalDetails.healthConditions || 'None'}
    *   Medications: ${personalDetails.medications || 'None'}

*   **Food Preferences:**
    *   Likes: ${personalDetails.favoriteFoods || 'Not specified'}
    *   Dislikes: ${personalDetails.dislikedFoods || 'None'}

**YOUR TASK:**

Generate 3-5 diverse recipes. For each recipe, provide the output in the following JSON format. Do not include any text outside of the main JSON array.

**JSON OUTPUT FORMAT:**

\`\`\`json
[
  {
    "title": "Recipe Title",
    "description": "A brief, enticing description of the dish.",
    "servings": 2,
    "ingredients": [
      "1 cup ingredient A",
      "2 tbsp ingredient B",
      "Pinch of ingredient C"
    ],
    "instructions": [
      "First step of the recipe.",
      "Second step of the recipe.",
      "Third step of the recipe."
    ],
    "macros": {
      "protein": 30,
      "carbs": 50,
      "fat": 15
    }
  }
]
\`\`\`
`;
        setGeneratedPrompt(prompt.trim());
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
    setRecipeToLog(recipe);
    setIsLogMealDialogOpen(true);
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
                  <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
                      {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                      Generate Meal Ideas
                  </Button>
              </form>
          </CardContent>
      </Card>

      {generatedPrompt && (
          <Card>
              <CardHeader>
                  <CardTitle>Generated AI Prompt</CardTitle>
                  <CardDescription>This is the prompt that would be sent to the AI. Review it to ensure all your data is captured correctly.</CardDescription>
              </CardHeader>
              <CardContent>
                  <pre className="p-4 bg-muted rounded-md text-sm whitespace-pre-wrap font-mono">
                      {generatedPrompt}
                  </pre>
              </CardContent>
          </Card>
      )}

      {/* This is the placeholder for where suggestions would go */}
      <div className="space-y-4">
        {isPending && !suggestions && !generatedPrompt && (
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
