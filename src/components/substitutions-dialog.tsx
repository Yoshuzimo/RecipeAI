
"use client";

import { useState } from "react";
import type { InventoryItem, Recipe } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { handleGenerateRecipeDetails } from "@/app/actions";
import { Loader2, Sparkles, PlusCircle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AddIngredientDialog } from "./add-ingredient-dialog";
import { Input } from "./ui/input";

export function SubstitutionsDialog({
  isOpen,
  setIsOpen,
  recipe: initialRecipe,
  inventory,
  onSubstitutionsApplied,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  recipe: Recipe;
  inventory: InventoryItem[];
  onSubstitutionsApplied: (updatedRecipe: Recipe) => void;
}) {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const [isAddIngredientOpen, setIsAddIngredientOpen] = useState(false);
  const [editableRecipe, setEditableRecipe] = useState<Recipe>(initialRecipe);

  const handleIngredientChange = (index: number, newValue: string) => {
    const newIngredients = [...editableRecipe.ingredients];
    newIngredients[index] = newValue;
    setEditableRecipe({ ...editableRecipe, ingredients: newIngredients });
  };

  const handleRemoveIngredient = (index: number) => {
    const newIngredients = editableRecipe.ingredients.filter((_, i) => i !== index);
    setEditableRecipe({ ...editableRecipe, ingredients: newIngredients });
  };

  const handleAddIngredient = (ingredient: string) => {
    const newIngredients = [...editableRecipe.ingredients, ingredient];
    setEditableRecipe({ ...editableRecipe, ingredients: newIngredients });
  };

  const handleFinalize = async () => {
    setIsPending(true);
    
    // The instructions might not be relevant if ingredients changed drastically, but we pass them along.
    // A more advanced implementation might ask the AI to regenerate instructions too.
    const instructionsArray = editableRecipe.instructions;
    const ingredientArray = editableRecipe.ingredients;

    const result = await handleGenerateRecipeDetails({
        title: editableRecipe.title,
        description: editableRecipe.description,
        ingredients: ingredientArray,
        instructions: instructionsArray,
    });

    if (result.recipe) {
        toast({
            title: "Recipe Finalized!",
            description: `We've recalculated servings and nutrition for "${result.recipe.title}".`
        });
        onSubstitutionsApplied(result.recipe);
        setIsOpen(false);
    } else {
        toast({
            variant: "destructive",
            title: "Error",
            description: result.error || "Failed to finalize recipe. Please try again."
        });
    }

    setIsPending(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit & Finalize Recipe</DialogTitle>
            <DialogDescription>
              Modify ingredients, then finalize with AI to get updated nutrition info.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-96 pr-6 my-4">
            <div className="space-y-4">
                <div>
                    <Label className="font-semibold text-lg">Title</Label>
                    <Input 
                        value={editableRecipe.title}
                        onChange={(e) => setEditableRecipe({...editableRecipe, title: e.target.value})}
                        className="mt-1"
                    />
                </div>
                 <div>
                    <Label className="font-semibold text-lg">Ingredients</Label>
                     <div className="space-y-2 mt-2">
                        {editableRecipe.ingredients.map((ingredient, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <Input
                                    value={ingredient}
                                    onChange={(e) => handleIngredientChange(index, e.target.value)}
                                    className="flex-1"
                                />
                                <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveIngredient(index)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                     </div>
                     <Button type="button" variant="outline" className="w-full mt-4" onClick={() => setIsAddIngredientOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Ingredient
                    </Button>
                </div>
            </div>
          </ScrollArea>
          
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleFinalize} disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {isPending ? "Finalizing..." : "Finalize with AI"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AddIngredientDialog
        isOpen={isAddIngredientOpen}
        setIsOpen={setIsAddIngredientOpen}
        inventory={inventory}
        onAddIngredient={handleAddIngredient}
      />
    </>
  );
}
