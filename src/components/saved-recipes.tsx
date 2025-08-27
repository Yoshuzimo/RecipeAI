
"use client";

import { useState, useEffect, useMemo } from "react";
import { Bookmark, Users, User, Trash2, AlertCircle, Loader2, ChefHat, Replace, Lock, Unlock, Edit, Minus, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import type { Recipe, InventoryItem, PersonalDetails, DailyMacros, InventoryItemGroup, Macros } from "@/lib/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Badge } from "./ui/badge";
import { finalizeRecipe } from "@/ai/flows/finalize-recipe";
import { handleSaveRecipe, handleRemoveSavedRecipe, getClientInventory, getClientPersonalDetails } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { LogMealDialog } from "./log-meal-dialog";
import { UserSubstitutionDialog } from "./user-substitution-dialog";
import { AISubstitutionDialog } from "./ai-substitution-dialog";
import { scaleIngredients } from "@/lib/utils";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";
import { EditMacrosDialog } from "./edit-macros-dialog";

const isRecipeOutdated = (recipe: Recipe): boolean => {
    return recipe.macros.fiber === undefined || recipe.macros.fats === undefined;
};

const RecipeCard = ({ 
    recipe: initialRecipe, 
    onRemoveClick, 
    onUpdateClick, 
    isUpdating, 
    isOwner,
    onCook,
    onSubstitute,
    onServingChange,
    onMacrosChange,
}: { 
    recipe: Recipe, 
    onRemoveClick?: (recipe: Recipe) => void,
    onUpdateClick: (recipe: Recipe) => void,
    isUpdating: boolean,
    isOwner: boolean,
    onCook: (recipe: Recipe) => void,
    onSubstitute: (recipe: Recipe) => void,
    onServingChange: (recipe: Recipe, newServings: number) => void,
    onMacrosChange: (recipe: Recipe, newMacros: Macros) => void,
}) => {
    const [recipe, setRecipe] = useState(initialRecipe);
    const [isEditMacrosOpen, setIsEditMacrosOpen] = useState(false);
    const outdated = isRecipeOutdated(recipe);

    useEffect(() => {
        setRecipe(initialRecipe);
    }, [initialRecipe]);

    return (
        <>
        <Card className="relative">
            {isOwner && onRemoveClick && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 z-10"
                    onClick={() => onRemoveClick(recipe)}
                    aria-label="Remove recipe"
                >
                    <Trash2 className="h-5 w-5 text-destructive" />
                </Button>
            )}
            <AccordionItem value={recipe.title} className="border-b-0">
                <CardHeader>
                    <AccordionTrigger className="pr-10">
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-semibold text-left">{recipe.title}</h3>
                                {outdated && !isUpdating && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <AlertCircle className="h-4 w-4 text-amber-500" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Missing detailed nutrition info.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                                {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 text-left">{recipe.description}</p>
                            <div className="text-left mt-2">
                                {recipe.macros.calories && <Badge variant="outline">Calories: {recipe.macros.calories.toFixed(0)} per serving</Badge>}
                            </div>
                        </div>
                    </AccordionTrigger>
                    {!isOwner && recipe.ownerName && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 pt-2">
                            <User className="h-3 w-3" />
                            <span>Saved by {recipe.ownerName}</span>
                        </div>
                    )}
                </CardHeader>
                <AccordionContent className="px-6 pb-6">
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                             <div className="flex items-center gap-4">
                                <Label htmlFor={`servings-${recipe.title}`}>Servings</Label>
                                <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => onServingChange(recipe, recipe.servings - 1)}><Minus className="h-4 w-4" /></Button>
                                <Input id={`servings-${recipe.title}`} type="number" className="w-16 h-8 text-center" value={recipe.servings} onChange={(e) => onServingChange(recipe, parseInt(e.target.value, 10) || 1)} />
                                <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => onServingChange(recipe, recipe.servings + 1)}><Plus className="h-4 w-4" /></Button>
                            </div>
                            {isOwner && outdated && (
                                <Button size="sm" variant="outline" onClick={() => onUpdateClick(recipe)} disabled={isUpdating}>
                                    {isUpdating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                    Update Nutrition
                                </Button>
                            )}
                        </div>
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
                             <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold">Macros (per serving)</h4>
                                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setIsEditMacrosOpen(true)}>
                                    <Edit className="h-3 w-3" />
                                    <span className="sr-only">Edit Macros</span>
                                </Button>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                <Badge variant="outline">Calories: {recipe.macros.calories?.toFixed(0)}</Badge>
                                <Badge variant="outline">Protein: {recipe.macros.protein?.toFixed(0)}g</Badge>
                                <Badge variant="outline">Carbs: {recipe.macros.carbs?.toFixed(0)}g</Badge>
                                <Badge variant="outline">Fat: {recipe.macros.fat?.toFixed(0)}g</Badge>
                                {recipe.macros.fiber !== undefined && <Badge variant="outline">Fiber: {recipe.macros.fiber?.toFixed(0)}g</Badge>}
                            </div>
                        </div>
                        <Separator />
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={() => onCook(recipe)}>
                                <ChefHat className="mr-2 h-4 w-4" />
                                Cook It
                            </Button>
                            <Button variant="outline" onClick={() => onSubstitute(recipe)}>
                                <Replace className="mr-2 h-4 w-4" />
                                Make Substitutions
                            </Button>
                        </div>
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Card>
        {isEditMacrosOpen && (
            <EditMacrosDialog 
                isOpen={isEditMacrosOpen}
                setIsOpen={setIsEditMacrosOpen}
                recipe={recipe}
                onSave={(newMacros) => onMacrosChange(recipe, newMacros)}
            />
        )}
        </>
    );
};

export function SavedRecipes({ initialRecipes, initialHouseholdRecipes }: { 
    initialRecipes: Recipe[],
    initialHouseholdRecipes: Recipe[],
}) {
  const [myRecipes, setMyRecipes] = useState(initialRecipes);
  const [householdRecipes, setHouseholdRecipes] = useState(initialHouseholdRecipes);
  const [updatingRecipes, setUpdatingRecipes] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);

  const [inventory, setInventory] = useState<{ privateItems: InventoryItem[], sharedItems: InventoryItem[] } | null>(null);
  const [personalDetails, setPersonalDetails] = useState<PersonalDetails | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Dialog states
  const [isLogMealDialogOpen, setIsLogMealDialogOpen] = useState(false);
  const [recipeToLog, setRecipeToLog] = useState<Recipe | null>(null);
  const [isUserSubDialogOpen, setIsUserSubDialogOpen] = useState(false);
  const [recipeToSubstitute, setRecipeToSubstitute] = useState<Recipe | null>(null);

  useEffect(() => {
    async function loadData() {
        setIsDataLoading(true);
        const [inv, details] = await Promise.all([getClientInventory(), getClientPersonalDetails()]);
        setInventory(inv);
        setPersonalDetails(details);
        setIsDataLoading(false);
    }
    loadData();
  }, []);

  const handleUpdateNutrition = async (recipe: Recipe) => {
    setUpdatingRecipes(prev => ({...prev, [recipe.title]: true}));
    try {
        const result = await finalizeRecipe({
            title: recipe.title,
            ingredients: recipe.ingredients,
            instructions: recipe.instructions,
        });

        if ('error' in result) {
            throw new Error(result.error);
        }

        const updatedRecipe = { ...recipe, macros: result.macros, servings: result.servings };
        await handleSaveRecipe(updatedRecipe);

        setMyRecipes(prev => prev.map(r => r.title === updatedRecipe.title ? updatedRecipe : r));
        toast({
            title: "Recipe Updated",
            description: `Nutritional info for "${recipe.title}" has been updated.`,
        });

    } catch (e) {
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: e instanceof Error ? e.message : "Could not update nutrition details."
        });
    } finally {
        setUpdatingRecipes(prev => ({...prev, [recipe.title]: false}));
    }
  }

  const handleRemoveClick = (recipe: Recipe) => {
    setRecipeToDelete(recipe);
  };
  
  const handleConfirmRemove = async () => {
    if (!recipeToDelete) return;

    const result = await handleRemoveSavedRecipe(recipeToDelete.title);
    if (result.success) {
        toast({ title: "Recipe Removed", description: `"${recipeToDelete.title}" has been removed from your recipe book.`});
        setMyRecipes(prev => prev.filter(r => r.title !== recipeToDelete.title));
    } else {
        toast({ variant: "destructive", title: "Error", description: result.error });
    }
    setRecipeToDelete(null);
  };

  const handleServingChange = (recipeToChange: Recipe, newServings: number) => {
    if (newServings <= 0) return;
    const newIngredients = scaleIngredients(recipeToChange.ingredients, recipeToChange.servings, newServings);
    const updatedRecipe = { ...recipeToChange, servings: newServings, ingredients: newIngredients };
    
    setMyRecipes(prev => prev.map(r => r.title === updatedRecipe.title ? updatedRecipe : r));
    setHouseholdRecipes(prev => prev.map(r => r.title === updatedRecipe.title ? updatedRecipe : r));
  }
  
  const handleMacrosChange = (recipeToChange: Recipe, newMacros: Macros) => {
      const updatedRecipe = { ...recipeToChange, macros: newMacros };
      setMyRecipes(prev => prev.map(r => r.title === updatedRecipe.title ? updatedRecipe : r));
      setHouseholdRecipes(prev => prev.map(r => r.title === updatedRecipe.title ? updatedRecipe : r));
  };
  
  const handleCookItClick = (recipe: Recipe) => {
      setRecipeToLog(recipe);
      setIsLogMealDialogOpen(true);
  };

  const handleSubstitutionClick = (recipe: Recipe) => {
      setRecipeToSubstitute(recipe);
      setIsUserSubDialogOpen(true);
  }

  const handleSubstitution = async (recipe: Recipe, original: string, newIngredient: string) => {
      const newIngredients = recipe.ingredients.map(ing => ing.toLowerCase() === original.toLowerCase() ? newIngredient : ing);
      const updatedRecipe = { ...recipe, ingredients: newIngredients };

       const result = await finalizeRecipe({
            title: updatedRecipe.title,
            ingredients: newIngredients,
            instructions: updatedRecipe.instructions
        });

        if ('error' in result) {
            toast({ variant: "destructive", title: "Update Failed", description: "Could not recalculate nutrition for the new ingredient." });
            return;
        }

        const finalUpdatedRecipe = { ...updatedRecipe, macros: result.macros, servings: result.servings };
        
        setMyRecipes(prev => prev.map(r => r.title === finalUpdatedRecipe.title ? finalUpdatedRecipe : r));
        setHouseholdRecipes(prev => prev.map(r => r.title === finalUpdatedRecipe.title ? finalUpdatedRecipe : r));

        toast({ title: "Recipe Updated", description: "Nutrition information has been recalculated." });
  };
  
  const handleMealLogged = async () => {
    const inv = await getClientInventory();
    setInventory(inv);
  };

  const renderRecipeList = (recipes: Recipe[], isOwner: boolean) => {
      if (isDataLoading) {
          return (
              <div className="space-y-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
              </div>
          )
      }
      if (recipes.length === 0) {
          return (
             <div className="text-center py-20 border-2 border-dashed rounded-lg">
                <Bookmark className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">No saved recipes yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    {isOwner ? "Go to the Meal Planner to save your first recipe!" : "No recipes have been shared in your household yet."}
                </p>
            </div>
          )
      }
      return (
        <Accordion type="single" collapsible className="w-full space-y-4">
            {recipes.map((recipe, index) => (
                <RecipeCard 
                    key={`${recipe.title}-${index}`} 
                    recipe={recipe} 
                    onRemoveClick={isOwner ? handleRemoveClick : undefined} 
                    onUpdateClick={handleUpdateNutrition}
                    isUpdating={!!updatingRecipes[recipe.title]}
                    isOwner={isOwner}
                    onCook={handleCookItClick}
                    onSubstitute={handleSubstitutionClick}
                    onServingChange={handleServingChange}
                    onMacrosChange={handleMacrosChange}
                />
            ))}
        </Accordion>
      )
  };

  return (
    <>
    <div className="space-y-8">
        <div className="flex items-center justify-between space-y-2">
            <div>
            <h1 className="text-3xl font-bold tracking-tight">Recipe Book</h1>
            <p className="text-muted-foreground">
                Your collection of favorite and custom recipes.
            </p>
            </div>
        </div>
        
        <Tabs defaultValue="my-recipes">
            <TabsList>
                <TabsTrigger value="my-recipes"><User className="mr-2 h-4 w-4" /> My Recipe Book</TabsTrigger>
                <TabsTrigger value="group-recipes"><Users className="mr-2 h-4 w-4" /> Group Recipe Book</TabsTrigger>
            </TabsList>
            <TabsContent value="my-recipes">
                {renderRecipeList(myRecipes, true)}
            </TabsContent>
            <TabsContent value="group-recipes">
                {renderRecipeList(householdRecipes, false)}
            </TabsContent>
        </Tabs>
    </div>

    <AlertDialog open={!!recipeToDelete} onOpenChange={() => setRecipeToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently remove "{recipeToDelete?.title}" from your recipe book. This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmRemove} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Remove</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    
    {isLogMealDialogOpen && recipeToLog && (
        <LogMealDialog 
            isOpen={isLogMealDialogOpen}
            setIsOpen={setIsLogMealDialogOpen}
            recipe={recipeToLog}
            onMealLogged={handleMealLogged}
        />
    )}

    {isUserSubDialogOpen && recipeToSubstitute && inventory && (
        <UserSubstitutionDialog 
            isOpen={isUserSubDialogOpen}
            setIsOpen={setIsUserSubDialogOpen}
            recipe={recipeToSubstitute}
            inventory={[...inventory.privateItems, ...inventory.sharedItems]}
            onSubstitution={handleSubstitution}
        />
    )}
    </>
  );
}
