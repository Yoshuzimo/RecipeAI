
"use client";

import React, { useState, useTransition, useRef, useMemo } from "react";
import { handleSaveRecipe, getClientInventory, getClientPersonalDetails, getClientTodaysMacros } from "@/app/actions";
import { generateMealSuggestions } from "@/ai/flows/generate-meal-suggestions";
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
  const [rawAiResponse, setRawAiResponse] = useState<string | { error: string } | null>(null);
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
    startTransition(async () => {
        const allItems = [...inventory.privateItems, ...inventory.sharedItems];
        const now = new Date();

        const formatItems = (items: InventoryItem[]) => {
            if (items.length === 0) return 'None';
            return items.map(item => {
                return `- ${item.name}: ${item.totalQuantity.toFixed(2)} ${item.unit}`;
            }).join('\\n');
        };

        const priorityItems = allItems.filter(item => 
            item.name.toLowerCase().startsWith('leftover') || 
            (item.expiryDate && differenceInDays(new Date(item.expiryDate), now) <= 2)
        );

        const regularInventory = allItems.filter(item => !priorityItems.find(p => p.id === item.id));

        const prompt = `
You are an expert chef and nutritionist AI. Your task is to generate 3-5 creative and delicious meal recipes based on the user's available inventory, preferences, and health data.

**USER'S CONTEXT:**

*   **Cravings / Mood:** ${cravingsRef.current?.value || 'Not specified'}

*   **Inventory to Use First (Leftovers & Expiring Items):**
    *   Give preference to using these items if possible.
        ${formatItems(priorityItems)}

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
        const finalPrompt = prompt.trim();
        setGeneratedPrompt(finalPrompt);
        setRawAiResponse(null); // Clear previous response
        
        try {
          const response = await generateMealSuggestions(finalPrompt);
          setRawAiResponse(response);
          // If the response is successful text, try to parse it.
          if (typeof response === 'string') {
              try {
                  const parsedSuggestions = JSON.parse(response);
                  setSuggestions(parsedSuggestions);
              } catch (parseError) {
                   console.error("Failed to parse AI response:", parseError);
                   setRawAiResponse({ error: "The AI returned a response, but it was not in the expected format. Check the raw response below." });
              }
          }
        } catch (error) {
          console.error("AI Generation Error:", error);
          const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
          toast({
            variant: "destructive",
            title: "AI Error",
            description: `Could not generate meal suggestions: ${errorMessage}`
          });
          setRawAiResponse({ error: errorMessage });
        }
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

      {isPending && (
          <Card>
              <CardHeader>
                  <CardTitle>Generating...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                  <p>The AI is thinking...</p>
                </div>
              </CardContent>
          </Card>
      )}

      {generatedPrompt && (
          <Card>
              <CardHeader>
                  <CardTitle>Generated AI Prompt</CardTitle>
                  <CardDescription>This is the prompt being sent to the AI. Review it to ensure all your data is captured correctly.</CardDescription>
              </CardHeader>
              <CardContent>
                  <pre className="p-4 bg-muted rounded-md text-sm whitespace-pre-wrap font-mono">
                      {generatedPrompt}
                  </pre>
              </CardContent>
          </Card>
      )}

      {rawAiResponse && (
          <Card>
              <CardHeader>
                  <CardTitle>Raw AI Response</CardTitle>
                   <CardDescription>This is the raw response from the AI. We'll format this into recipe cards next.</CardDescription>
              </CardHeader>
              <CardContent>
                  <pre className={cn("p-4 bg-muted rounded-md text-sm whitespace-pre-wrap font-mono", typeof rawAiResponse === 'object' && 'bg-destructive/20 text-destructive-foreground')}>
                      {typeof rawAiResponse === 'string' ? rawAiResponse : rawAiResponse.error}
                  </pre>
              </CardContent>
          </Card>
      )}

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
