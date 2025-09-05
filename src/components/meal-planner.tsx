

"use client";

import React, { useState, useTransition, useRef, useMemo } from "react";
import { handleSaveRecipe, getClientInventory, getClientPersonalDetails, getClientTodaysMacros, handleRemoveSavedRecipe } from "@/app/actions";
import { generateMealSuggestions } from "@/ai/flows/generate-meal-suggestions";
import { finalizeRecipe } from "@/ai/flows/finalize-recipe";
import type { InventoryItem, Recipe, InventoryItemGroup, Substitution, PersonalDetails, DailyMacros, AISuggestion, Macros } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, ChefHat, Bookmark, Minus, Plus, TriangleAlert, PlusCircle, Edit, Lock, Unlock, Replace } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Badge } from "./ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ViewInventoryItemDialog } from "./view-inventory-item-dialog";
import { useRateLimiter } from "@/hooks/use-rate-limiter.tsx";
import { LogMealDialog } from "./log-meal-dialog";
import { Separator } from "./ui/separator";
import { CreateRecipeDialog } from "./create-recipe-dialog";
import { cn } from "@/lib/utils";
import { parseIngredient, scaleIngredients } from "@/lib/utils";
import { differenceInDays, formatDistanceToNow } from "date-fns";
import { UserSubstitutionDialog } from "./user-substitution-dialog";
import { AISubstitutionDialog } from "./ai-substitution-dialog";
import { IngredientActionDialog } from "./ingredient-action-dialog";
import { ReportSpoilageDialog } from "./report-spoilage-dialog";
import { EditMacrosDialog } from "./edit-macros-dialog";


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
  const [modifiedRecipes, setModifiedRecipes] = useState<Record<string, Recipe>>({});

  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [rawAiResponse, setRawAiResponse] = useState<string | { error: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const cravingsRef = useRef<HTMLInputElement>(null);
  
  const [isIngredientActionOpen, setIsIngredientActionOpen] = useState(false);
  const [selectedIngredientInfo, setSelectedIngredientInfo] = useState<{recipe: Recipe, ingredient: string} | null>(null);

  const [isViewInventoryDialogOpen, setIsViewInventoryDialogOpen] = useState(false);
  const [groupToView, setGroupToView] = useState<InventoryItemGroup | null>(null);

  const [isLogMealDialogOpen, setIsLogMealDialogOpen] = useState(false);
  const [recipeToLog, setRecipeToLog] = useState<Recipe | null>(null);

  const [isCreateRecipeDialogOpen, setIsCreateRecipeDialogOpen] = useState(false);
  
  const [isUserSubDialogOpen, setIsUserSubDialogOpen] = useState(false);
  const [isAISubDialogOpen, setIsAISubDialogOpen] = useState(false);
  const [isSpoilageDialogOpen, setIsSpoilageDialogOpen] = useState(false);
  const [isEditMacrosOpen, setIsEditMacrosOpen] = useState(false);

  const [recipeToSubstitute, setRecipeToSubstitute] = useState<Recipe | null>(null);
  const [ingredientToSubstitute, setIngredientToSubstitute] = useState<string | null>(null);
  const [recipeToEditMacros, setRecipeToEditMacros] = useState<Recipe | null>(null);

  const [groupToReportSpoilage, setGroupToReportSpoilage] = useState<InventoryItemGroup | null>(null);


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
                let itemString = `- ${item.name}: ${item.totalQuantity.toFixed(2)} ${item.unit}`;
                if (item.macros) {
                    const { calories, protein, carbs, fat } = item.macros;
                    itemString += ` (C:${calories} P:${protein} Crb:${carbs} F:${fat} per 100g/ml)`;
                }
                return itemString;
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

Generate 3-5 diverse recipes using ONLY the ingredients listed in the user's inventory. Do not suggest recipes that require ingredients the user does not have.

If the user's inventory is empty or contains fewer than 5 items, you may assume they have common pantry staples like: salt, pepper, olive oil, all-purpose flour, sugar, onions, and garlic.

For each recipe, provide the output in the following JSON format. Do not include any text outside of the main JSON array.

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
                     setRawAiResponse(jsonString); 
                }
            } else {
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

  const handleSaveToggle = async (recipe: Recipe) => {
    const isSaved = savedRecipeTitles.has(recipe.title);
    if (isSaved) {
      const result = await handleRemoveSavedRecipe(recipe.title);
      if (result.success) {
        toast({
          title: "Recipe Unsaved",
          description: `"${recipe.title}" has been removed from your saved recipes.`,
        });
        setSavedRecipes(prev => prev.filter(r => r.title !== recipe.title));
      } else {
        toast({ variant: "destructive", title: "Error", description: result.error });
      }
    } else {
      const result = await handleSaveRecipe(recipe);
      if (result.success) {
        toast({
          title: "Recipe Saved!",
          description: `"${recipe.title}" has been added to your saved recipes.`,
        });
        setSavedRecipes(prev => [...prev, recipe]);
      } else {
        toast({ variant: "destructive", title: "Error", description: result.error });
      }
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
      setSelectedIngredientInfo({ recipe, ingredient });
      setIsIngredientActionOpen(true);
  }
  
  const handleIngredientAction = (action: 'substitute' | 'spoilage') => {
    if (!selectedIngredientInfo) return;
    const { recipe, ingredient } = selectedIngredientInfo;

    if (action === 'substitute') {
        setRecipeToSubstitute(recipe);
        setIngredientToSubstitute(ingredient);
        setIsAISubDialogOpen(true);
    } else { // spoilage
        const allItems = [...inventory.privateItems, ...inventory.sharedItems];
        const inventoryItem = allItems.find(item => ingredient.toLowerCase().includes(item.name.toLowerCase()));
        if (inventoryItem) {
            const itemsForGroup = allItems.filter(i => i.name === inventoryItem.name);
            const group: InventoryItemGroup = {
                name: inventoryItem.name,
                items: itemsForGroup,
                packageInfo: '',
                nextExpiry: itemsForGroup.length > 0 ? itemsForGroup.sort((a,b) => (a.expiryDate?.getTime() ?? 0) - (b.expiryDate?.getTime() ?? 0))[0].expiryDate : null,
                unit: inventoryItem.unit,
                isPrivate: inventoryItem.isPrivate,
                locationId: inventoryItem.locationId,
                locationName: '',
            };
            setGroupToReportSpoilage(group);
            setIsSpoilageDialogOpen(true);
        } else {
            toast({
                variant: 'destructive',
                title: 'Item not in inventory',
                description: `Could not find "${ingredient}" in your inventory to report spoilage.`,
            });
        }
    }

    setIsIngredientActionOpen(false);
  };


  const handleInventoryUpdateAndCheck = async () => {
    const updatedInventory = await getClientInventory();
    setInventory(updatedInventory);
  };
  
  const handleCookItClick = (recipe: Recipe) => {
    const currentRecipe = modifiedRecipes[recipe.title] || recipe;
    setRecipeToLog(currentRecipe);
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
    setModifiedRecipes(prev => ({ ...prev, [newRecipe.title]: newRecipe }));
  }

  const handleServingChange = (recipeTitle: string, newServingSize: number) => {
    const updateRecipe = (recipe: Recipe) => {
        if (recipe.title === recipeTitle) {
            if (newServingSize <= 0) return recipe;
            const newIngredients = scaleIngredients(recipe.ingredients, recipe.servings, newServingSize);
            const updatedRecipe = { ...recipe, servings: newServingSize, ingredients: newIngredients };
            setModifiedRecipes(prev => ({...prev, [recipeTitle]: updatedRecipe}));
            return updatedRecipe;
        }
        return recipe;
    }
    
    if (userRecipe?.title === recipeTitle) {
      setUserRecipe(prev => prev ? updateRecipe(prev) : null);
    }

    setSuggestions(prevSuggestions => {
      if (!prevSuggestions) return null;
      return prevSuggestions.map(updateRecipe);
    });
  };
  
  const handleSubstitution = (recipe: Recipe, originalIngredient: string, newIngredient: string) => {
        const newIngredients = recipe.ingredients.map(ing => ing.toLowerCase() === originalIngredient.toLowerCase() ? newIngredient : ing);
        const updatedRecipe: Recipe = { ...recipe, ingredients: newIngredients };

        startTransition(async () => {
            const finalizationResult = await finalizeRecipe({
                title: updatedRecipe.title,
                ingredients: newIngredients,
                instructions: updatedRecipe.instructions
            });

            if ('error' in finalizationResult) {
                toast({ variant: "destructive", title: "Update Failed", description: "Could not recalculate nutrition for the new ingredient." });
                return;
            }

            const finalUpdatedRecipe = { ...updatedRecipe, ...finalizationResult };
            
            if (userRecipe?.title === recipe.title) {
                setUserRecipe(finalUpdatedRecipe);
            }

            setSuggestions(prev => prev?.map(r => r.title === recipe.title ? finalUpdatedRecipe : r) || null);
            setModifiedRecipes(prev => ({...prev, [recipe.title]: finalUpdatedRecipe }));

            toast({ title: "Recipe Updated", description: "Nutrition information has been recalculated." });
        });
  };

  const handleMacrosSave = (recipeTitle: string, newMacros: Macros) => {
    const updateRecipe = (recipe: Recipe) => {
      if (recipe.title === recipeTitle) {
        const updatedRecipe = { ...recipe, macros: newMacros };
        setModifiedRecipes(prev => ({ ...prev, [recipeTitle]: updatedRecipe }));
        return updatedRecipe;
      }
      return recipe;
    };

    if (userRecipe?.title === recipeTitle) {
      setUserRecipe(prev => (prev ? updateRecipe(prev) : null));
    }

    setSuggestions(prevSuggestions => {
      if (!prevSuggestions) return null;
      return prevSuggestions.map(updateRecipe);
    });
  };

  const handleEditMacrosClick = (recipe: Recipe) => {
    setRecipeToEditMacros(recipe);
    setIsEditMacrosOpen(true);
  };


  const RecipeCard = ({ recipe: initialRecipe, isExpanded = false }: { recipe: Recipe, isExpanded?: boolean }) => {
    const recipe = modifiedRecipes[initialRecipe.title] || initialRecipe;
    const [isPrivate, setIsPrivate] = useState(recipe.isPrivate ?? false);
    const isSaved = savedRecipeTitles.has(recipe.title);

    const handlePrivacyToggle = () => {
        setIsPrivate(prev => {
            const newPrivacy = !prev;
            if (userRecipe) {
                const updatedRecipe = { ...userRecipe, isPrivate: newPrivacy };
                setUserRecipe(updatedRecipe);
                setModifiedRecipes(prevMods => ({...prevMods, [updatedRecipe.title]: updatedRecipe}));
            }
            return newPrivacy;
        });
    };
    
    return (
        <Card className="relative">
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                {isExpanded && (
                    <Button variant="ghost" size="icon" onClick={handlePrivacyToggle} aria-label="Toggle privacy">
                        {isPrivate ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
                    </Button>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleSaveToggle(recipe)}
                    aria-label="Save recipe"
                >
                    <Bookmark className={cn("h-5 w-5", isSaved && "fill-primary text-primary")} />
                </Button>
            </div>
            <AccordionItem value={recipe.title} className="border-b-0">
                <CardHeader>
                <AccordionTrigger disabled={isExpanded} className="pr-10">
                    <div>
                    <h3 className="text-lg font-semibold text-left">{recipe.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 text-left">{recipe.description}</p>
                    <div className="text-left mt-2">
                        <Badge variant="outline">Calories: {recipe.macros.calories.toFixed(0)} per serving</Badge>
                    </div>
                    </div>
                </AccordionTrigger>
                </CardHeader>
                <AccordionContent className="px-6 pb-6">
                <div className="space-y-6">
                    <div>
                        <div className="flex items-center gap-4">
                        <Label htmlFor={`servings-${recipe.title}`}>Servings</Label>
                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleServingChange(recipe.title, recipe.servings - 1)}><Minus className="h-4 w-4" /></Button>
                        <Input id={`servings-${recipe.title}`} type="number" className="w-16 h-8 text-center" value={recipe.servings} onChange={(e) => handleServingChange(recipe.title, parseInt(e.target.value, 10) || 1)} />
                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleServingChange(recipe.title, recipe.servings + 1)}><Plus className="h-4 w-4" /></Button>
                        </div>
                        {recipe.servingSize && <p className="text-xs text-muted-foreground mt-1">Serving size: ~{recipe.servingSize}</p>}
                    </div>
                    <div>
                    <h4 className="font-semibold mb-2">Ingredients</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        {recipe.ingredients.map((ing, i) => {
                        const status = getIngredientStatus(ing);
                        return (
                            <li key={i} onClick={() => handleIngredientClick(recipe, ing)} className={cn("cursor-pointer hover:text-primary", status.startsWith('expired') ? 'text-destructive' : '')}>
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
                    <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">Macros (per serving)</h4>
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleEditMacrosClick(recipe)}>
                            <Edit className="h-3 w-3" />
                            <span className="sr-only">Edit Macros</span>
                        </Button>
                    </div>
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
                        <Button variant="outline" onClick={() => { setRecipeToSubstitute(recipe); setIsUserSubDialogOpen(true); }}>
                            <Replace className="mr-2 h-4 w-4" />
                            Make Substitutions
                        </Button>
                    </div>
                </div>
                </AccordionContent>
            </AccordionItem>
        </Card>
    );
}

  return (
    <>
    <div className="space-y-8">
      <Card>
          <CardHeader>
              <CardTitle>Meal Planner</CardTitle>
              <CardDescription>
                  Tell us what you're in the mood for, and we'll generate some ideas. Or, create your own recipe!
              </CardDescription>
          </CardHeader>
          <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid w-full items-center gap-1.5">
                      <Label htmlFor="cravings">Cravings, Mood, or Notes</Label>
                      <Input ref={cravingsRef} id="cravings" placeholder="e.g., something spicy, quick & easy, I'm craving chicken..." />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={isPending}>
                        <>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Generate Meal Ideas
                        </>
                    </Button>
                     <Button type="button" variant="outline" onClick={() => setIsCreateRecipeDialogOpen(true)}>
                        <>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create a Meal
                        </>
                    </Button>
                  </div>
              </form>
          </CardContent>
      </Card>

      {isPending && !suggestions && !userRecipe && (
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

      {userRecipe && (
           <Accordion type="single" collapsible defaultValue={userRecipe.title} className="w-full space-y-4">
            <RecipeCard recipe={userRecipe} isExpanded={true} />
          </Accordion>
      )}


      {suggestions && suggestions.length > 0 && (
           <Accordion type="single" collapsible defaultValue="item-0" className="w-full space-y-4">
               {suggestions.map((recipe, index) => (
                   <RecipeCard recipe={recipe} key={`${recipe.title}-${index}`} />
               ))}
           </Accordion>
      )}
      
      {/* {rawAiResponse && (
        <Card>
          <CardHeader>
            <CardTitle>Raw AI Response</CardTitle>
            <CardDescription>For debugging purposes.</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="p-4 bg-muted rounded-md overflow-x-auto text-sm">
                <code>{typeof rawAiResponse === 'string' ? rawAiResponse : JSON.stringify(rawAiResponse, null, 2)}</code>
            </pre>
          </CardContent>
        </Card>
      )} */}

    </div>
    
      {isIngredientActionOpen && selectedIngredientInfo && (
        <IngredientActionDialog
            isOpen={isIngredientActionOpen}
            onClose={() => setIsIngredientActionOpen(false)}
            onSelectAction={handleIngredientAction}
            ingredientName={selectedIngredientInfo.ingredient}
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
       {isUserSubDialogOpen && recipeToSubstitute && (
        <UserSubstitutionDialog
            isOpen={isUserSubDialogOpen}
            setIsOpen={setIsUserSubDialogOpen}
            recipe={recipeToSubstitute}
            inventory={[...inventory.privateItems, ...inventory.sharedItems]}
            onSubstitution={handleSubstitution}
        />
      )}
      {isAISubDialogOpen && recipeToSubstitute && ingredientToSubstitute && (
        <AISubstitutionDialog
            isOpen={isAISubDialogOpen}
            setIsOpen={() => { setIsAISubDialogOpen(false); setIngredientToSubstitute(null); }}
            recipe={recipeToSubstitute}
            ingredientToReplace={ingredientToSubstitute}
            inventory={[...inventory.privateItems, ...inventory.sharedItems]}
            personalDetails={personalDetails}
            onSubstitution={handleSubstitution}
        />
      )}
      {isSpoilageDialogOpen && groupToReportSpoilage && (
          <ReportSpoilageDialog
            isOpen={isSpoilageDialogOpen}
            setIsOpen={setIsSpoilageDialogOpen}
            group={groupToReportSpoilage}
            packageGroups={Object.values(groupToReportSpoilage.items.reduce((acc, item) => {
                const size = item.originalQuantity;
                if (!acc[size]) {
                    acc[size] = { size, fullPackages: [], partialPackage: null, items: [] };
                }
                acc[size].items.push(item);
                if (item.totalQuantity === item.originalQuantity) {
                    acc[size].fullPackages.push(item);
                } else {
                    acc[size].partialPackage = item;
                }
                return acc;
            }, {} as Record<number, any>))}
            onUpdateComplete={async () => {
                 const { privateItems, sharedItems } = await getClientInventory();
                 handleInventoryUpdateAndCheck();
            }}
          />
      )}
      {isEditMacrosOpen && recipeToEditMacros && (
        <EditMacrosDialog
          isOpen={isEditMacrosOpen}
          setIsOpen={setIsEditMacrosOpen}
          recipe={recipeToEditMacros}
          onSave={(newMacros) => handleMacrosSave(recipeToEditMacros.title, newMacros)}
        />
      )}
    </>
  );
}
