
"use client";

import { useEffect, useState } from "react";
import type { Recipe, InventoryItem } from "@/lib/types";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { handleLogCookedMeal } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snack";

const getDefaultMealType = (): MealType => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Breakfast";
    if (hour >= 12 && hour < 17) return "Lunch";
    if (hour >= 17 && hour < 21) return "Dinner";
    return "Snack";
}

export function LogMealDialog({
  isOpen,
  setIsOpen,
  recipe,
  onMealLogged,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  recipe: Recipe;
  onMealLogged: (newInventory: InventoryItem[]) => void;
}) {
  const { toast } = useToast();
  const [servingsEaten, setServingsEaten] = useState(1);
  const [storageMethod, setStorageMethod] = useState("Fridge");
  const [isPending, setIsPending] = useState(false);
  const [mealType, setMealType] = useState<MealType>("Breakfast");

  useEffect(() => {
    if(isOpen) {
        setServingsEaten(1);
        setStorageMethod("Fridge");
        setMealType(getDefaultMealType());
    }
  }, [isOpen]);


  const servingsLeft = recipe.servings - servingsEaten;

  const handleSubmit = async () => {
    setIsPending(true);
    const result = await handleLogCookedMeal(recipe, servingsEaten, storageMethod, mealType);
    setIsPending(false);

    if (result.success && result.newInventory) {
      toast({
        title: "Meal Logged!",
        description: `"${recipe.title}" has been deducted, and leftovers are now in your inventory.`,
      });
      onMealLogged(result.newInventory);
      setIsOpen(false);
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.error || "Failed to log meal. Please try again.",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Your Meal: {recipe.title}</DialogTitle>
          <DialogDescription>
            Deduct ingredients from your inventory and add any leftovers. Total servings made: {recipe.servings}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="meal-type">What meal is this?</Label>
            <Select value={mealType} onValueChange={(value: MealType) => setMealType(value)}>
                <SelectTrigger id="meal-type">
                    <SelectValue placeholder="Select a meal type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Breakfast">Breakfast</SelectItem>
                    <SelectItem value="Lunch">Lunch</SelectItem>
                    <SelectItem value="Dinner">Dinner</SelectItem>
                    <SelectItem value="Snack">Snack</SelectItem>
                </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="servings-eaten">How many servings did you eat?</Label>
            <Input
              id="servings-eaten"
              type="number"
              value={servingsEaten}
              onChange={(e) => setServingsEaten(Math.min(recipe.servings, Math.max(0, parseInt(e.target.value, 10))))}
              min={0}
              max={recipe.servings}
            />
          </div>
          {servingsLeft > 0 && (
             <div className="space-y-2">
                <Label htmlFor="storage-method">Where are the {servingsLeft} leftover serving(s) stored?</Label>
                 <Select value={storageMethod} onValueChange={setStorageMethod}>
                    <SelectTrigger id="storage-method">
                        <SelectValue placeholder="Select storage location" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Fridge">Fridge (Expires in ~3 days)</SelectItem>
                        <SelectItem value="Freezer">Freezer (Expires in ~2 months)</SelectItem>
                    </SelectContent>
                 </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? "Logging..." : "Log Meal & Update Inventory"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
