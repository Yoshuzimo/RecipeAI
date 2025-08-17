
"use client";

import { useEffect, useState } from "react";
import type { Recipe, InventoryItem, StorageLocation } from "@/lib/types";
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
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { getStorageLocations } from "@/lib/data";

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
  const [servingsEatenByOthers, setServingsEatenByOthers] = useState(0);
  const [fridgeLeftovers, setFridgeLeftovers] = useState(0);
  const [freezerLeftovers, setFreezerLeftovers] = useState(0);
  const [isPending, setIsPending] = useState(false);
  const [mealType, setMealType] = useState<MealType>("Breakfast");

  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [fridgeLocations, setFridgeLocations] = useState<StorageLocation[]>([]);
  const [freezerLocations, setFreezerLocations] = useState<StorageLocation[]>([]);
  const [selectedFridge, setSelectedFridge] = useState<string>('');
  const [selectedFreezer, setSelectedFreezer] = useState<string>('');

  useEffect(() => {
    async function fetchLocations() {
      const locations = await getStorageLocations();
      setStorageLocations(locations);
      const fridges = locations.filter(l => l.type === 'Fridge');
      const freezers = locations.filter(l => l.type === 'Freezer');
      setFridgeLocations(fridges);
      setFreezerLocations(freezers);
      if (fridges.length > 0) setSelectedFridge(fridges[0].id);
      if (freezers.length > 0) setSelectedFreezer(freezers[0].id);
    }
    fetchLocations();
  }, []);

  // Reset state and calculate initial leftovers when dialog opens or recipe changes
  useEffect(() => {
    if (isOpen) {
      const initialServingsEaten = 1;
      const initialServingsEatenByOthers = 0;
      const remaining = recipe.servings - initialServingsEaten - initialServingsEatenByOthers;
      
      setServingsEaten(initialServingsEaten);
      setServingsEatenByOthers(initialServingsEatenByOthers);
      setFridgeLeftovers(Math.max(0, remaining));
      setFreezerLeftovers(0);
      setMealType(getDefaultMealType());
    }
  }, [isOpen, recipe.servings]);
  
  const totalServingsDistributed = servingsEaten + servingsEatenByOthers + fridgeLeftovers + freezerLeftovers;
  const remainingServings = recipe.servings - totalServingsDistributed;
  const isOverallocated = remainingServings < 0;

  const handleNumericChange = (value: string, setter: React.Dispatch<React.SetStateAction<number>>) => {
      const num = parseInt(value, 10);
      setter(isNaN(num) ? 0 : num);
  }
  
  const handleSubmit = async () => {
    if (isOverallocated) {
        toast({
            variant: "destructive",
            title: "Too many servings",
            description: "The total number of servings distributed cannot exceed the servings made."
        });
        return;
    }

    setIsPending(true);
    const result = await handleLogCookedMeal(
        recipe, 
        servingsEaten, 
        servingsEatenByOthers, 
        [{locationId: selectedFridge, servings: fridgeLeftovers}], 
        [{locationId: selectedFreezer, servings: freezerLeftovers}], 
        mealType
    );
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
            Account for all servings to deduct ingredients and log leftovers. Total made: {recipe.servings}.
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
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="servings-eaten">Servings You Ate</Label>
                <Input
                id="servings-eaten"
                type="number"
                value={servingsEaten}
                onChange={(e) => handleNumericChange(e.target.value, setServingsEaten)}
                min={0}
                />
            </div>
             <div className="space-y-2">
                <Label htmlFor="servings-eaten-by-others">Servings Others Ate</Label>
                <Input
                id="servings-eaten-by-others"
                type="number"
                value={servingsEatenByOthers}
                onChange={(e) => handleNumericChange(e.target.value, setServingsEatenByOthers)}
                min={0}
                />
            </div>
          </div>
          
           <div className="space-y-4 rounded-md border p-4">
            <h4 className="font-medium">Store Leftovers</h4>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="fridge-leftovers">Servings to Fridge</Label>
                    <Input
                    id="fridge-leftovers"
                    type="number"
                    value={fridgeLeftovers}
                    onChange={(e) => handleNumericChange(e.target.value, setFridgeLeftovers)}
                    min={0}
                    />
                </div>
                {fridgeLocations.length > 1 && fridgeLeftovers > 0 && (
                     <div className="space-y-2">
                        <Label htmlFor="fridge-location">Fridge Location</Label>
                        <Select value={selectedFridge} onValueChange={setSelectedFridge}>
                            <SelectTrigger id="fridge-location"><SelectValue/></SelectTrigger>
                            <SelectContent>
                                {fridgeLocations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="freezer-leftovers">Servings to Freezer</Label>
                    <Input
                    id="freezer-leftovers"
                    type="number"
                    value={freezerLeftovers}
                    onChange={(e) => handleNumericChange(e.target.value, setFreezerLeftovers)}
                    min={0}
                    />
                </div>
                 {freezerLocations.length > 1 && freezerLeftovers > 0 && (
                     <div className="space-y-2">
                        <Label htmlFor="freezer-location">Freezer Location</Label>
                        <Select value={selectedFreezer} onValueChange={setSelectedFreezer}>
                            <SelectTrigger id="freezer-location"><SelectValue/></SelectTrigger>
                            <SelectContent>
                                {freezerLocations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>
          </div>
          
          {isOverallocated ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Overallocated</AlertTitle>
              <AlertDescription>
                You have allocated {Math.abs(remainingServings)} more serving(s) than were made.
              </AlertDescription>
            </Alert>
          ) : (
             <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Servings Check</AlertTitle>
              <AlertDescription>
                {remainingServings} of {recipe.servings} servings are unallocated.
              </AlertDescription>
            </Alert>
          )}

        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || isOverallocated}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? "Logging..." : "Log Meal & Update Inventory"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
