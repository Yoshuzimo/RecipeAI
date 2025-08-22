
"use client";

import React, { useState, useTransition, useRef, useMemo } from "react";
import { handleSaveRecipe, getClientInventory, getClientPersonalDetails, getClientTodaysMacros } from "@/app/actions";
import { generateMealSuggestions } from "@/ai/flows/generate-meal-suggestions";
import { finalizeRecipe } from "@/ai/flows/finalize-recipe";
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
  const [userRecipe, setUserRecipe] = useState<Recipe | null>(null);
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
        setUserRecipe(null);
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
      "calories": 250,
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
        setSuggestions(null);
        setRawAiResponse(null);
        
        try {
          const response = await generateMealSuggestions(finalPrompt);
          setRawAiResponse(response);

          if (typeof response === 'string') {
              const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
              const jsonString = jsonMatch ? jsonMatch[1] : response;
              
              try {
                  const parsedSuggestions = JSON.parse(jsonString);
                  setSuggestions(parsedSuggestions);
              } catch (parseError) {
                   console.error("Failed to parse AI response:", parseError);
                   toast({
                        variant: "destructive",
                        title: "AI Response Error",
                        description: "The AI returned a response, but it was not in the expected format. Check the raw response below.",
                   });
                   setRawAiResponse(response);
              }
          } else {
            // Handle the case where the response is already an error object
            toast({
                variant: "destructive",
                title: "AI Error",
                description: response.error || "An unknown AI error occurred.",
            });
            setRawAiResponse(response);
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
    setSuggestions(null); // Clear AI suggestions
    setUserRecipe(newRecipe);
  }

  const handleServingChange = (recipeTitle: string, newServingSize: number) => {
    const updateRecipe = (recipe: Recipe) => {
        if (recipe.title === recipeTitle) {
            if (newServingSize <= 0) return recipe;
            const newIngredients = scaleIngredients(recipe.ingredients, recipe.servings, newServingSize);
            return { ...recipe, servings: newServingSize, ingredients: newIngredients };
        }
        return recipe;
    }

    if (userRecipe && userRecipe.title === recipeTitle) {
        setUserRecipe(updateRecipe(userRecipe));
    }

    setSuggestions(prevSuggestions => {
      if (!prevSuggestions) return null;
      return prevSuggestions.map(updateRecipe);
    });
  };

  const RecipeCard = ({ recipe, isExpanded = false }: { recipe: Recipe, isExpanded?: boolean }) => (
    <Card className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 z-10"
        onClick={() => saveRecipeAction(recipe)}
        disabled={savedRecipeTitles.has(recipe.title)}
        aria-label="Save recipe"
      >
        <Bookmark className={cn("h-5 w-5", savedRecipeTitles.has(recipe.title) && "fill-primary text-primary")} />
      </Button>
      <AccordionItem value={recipe.title} className="border-b-0">
        <CardHeader>
          <AccordionTrigger disabled={isExpanded} className="pr-10">
            <div>
              <h3 className="text-lg font-semibold text-left">{recipe.title}</h3>
              <p className="text-sm text-muted-foreground mt-1 text-left">{recipe.description}</p>
            </div>
          </AccordionTrigger>
        </CardHeader>
        <AccordionContent className="px-6 pb-6">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Label htmlFor={`servings-${recipe.title}`}>Servings</Label>
              <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleServingChange(recipe.title, recipe.servings - 1)}><Minus className="h-4 w-4" /></Button>
              <Input id={`servings-${recipe.title}`} type="number" className="w-16 h-8 text-center" value={recipe.servings} onChange={(e) => handleServingChange(recipe.title, parseInt(e.target.value, 10))} />
              <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleServingChange(recipe.title, recipe.servings + 1)}><Plus className="h-4 w-4" /></Button>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Ingredients</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                {recipe.ingredients.map((ing, i) => {
                  const status = getIngredientStatus(ing);
                  return (
                    <li key={i} onClick={() => handleIngredientClick(recipe, ing)} className={status.startsWith('expired') ? 'cursor-pointer' : ''}>
                      {ing}
                      {status === 'expired-high-risk' && <Badge variant="destructive" className="ml-2">Expired</Badge>}
                      {status === 'expired-low-risk' && <Badge variant="secondary" className="ml-2">Expired</Badge>}
                    </li>
                  );
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
                <Badge variant="outline">Calories: {recipe.macros.calories.toFixed(0)}</Badge>
                <Badge variant="outline">Protein: {recipe.macros.protein.toFixed(0)}g</Badge>
                <Badge variant="outline">Carbs: {recipe.macros.carbs.toFixed(0)}g</Badge>
                <Badge variant="outline">Fat: {recipe.macros.fat.toFixed(0)}g</Badge>
              </div>
            </div>
            <Separator />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => handleCookItClick(recipe)}>
                <ChefHat className="mr-2 h-4 w-4" />
                Cook It
              </Button>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Card>
  );


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

      {userRecipe && <RecipeCard recipe={userRecipe} isExpanded={true} />}

      {suggestions && suggestions.length > 0 && (
           <Accordion type="single" collapsible defaultValue="item-0" className="w-full space-y-4">
               {suggestions.map((recipe, index) => (
                   <RecipeCard recipe={recipe} key={`${recipe.title}-${index}`} />
               ))}
           </Accordion>
      )}

      {/* <div className="text-center py-10 border-2 border-dashed rounded-lg">
        <ChefHat className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">Ready to cook?</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate some ideas or create your own meal.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => setIsCreateRecipeDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create a Meal
        </Button>
      </div> */}
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
