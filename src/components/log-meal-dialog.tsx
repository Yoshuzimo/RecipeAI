
"use client";

import { useEffect, useState } from "react";
import type { Recipe, StorageLocation, LeftoverDestination, Household } from "@/lib/types";
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
import { getClientStorageLocations, getClientHousehold, handleLogMeal } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Loader2, Users } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Checkbox } from "./ui/checkbox";
import { useAuth } from "./auth-provider";
import { Slider } from "./ui/slider";

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
  onMealLogged: (newInventory: any) => void;
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [servingsEaten, setServingsEaten] = useState(1);
  const [isPending, setIsPending] = useState(false);
  const [mealType, setMealType] = useState<MealType>("Breakfast");

  const [fridgeServings, setFridgeServings] = useState(0);
  const [freezerServings, setFreezerServings] = useState(0);

  const [fridgeLocations, setFridgeLocations] = useState<StorageLocation[]>([]);
  const [freezerLocations, setFreezerLocations] = useState<StorageLocation[]>([]);
  
  const [fridgeLocationId, setFridgeLocationId] = useState<string>("");
  const [freezerLocationId, setFreezerLocationId] = useState<string>("");

  const [household, setHousehold] = useState<Household | null>(null);
  const [servingsForOthers, setServingsForOthers] = useState(0);
  const [selectedMembers, setSelectedMembers] = useState<Record<string, boolean>>({});

  const otherMembers = household?.activeMembers.filter(m => m.userId !== user?.uid) || [];

  // Initialize state when the dialog opens
  useEffect(() => {
    if (isOpen) {
      async function fetchInitialData() {
        const [locations, hh] = await Promise.all([
            getClientStorageLocations(),
            getClientHousehold()
        ]);
        setHousehold(hh);

        const fridges = locations.filter(l => l.type === 'Fridge');
        const freezers = locations.filter(l => l.type === 'Freezer');
        setFridgeLocations(fridges);
        setFreezerLocations(freezers);
        if(fridges.length > 0) setFridgeLocationId(fridges[0].id);
        if(freezers.length > 0) setFreezerLocationId(freezers[0].id);
        
        setServingsEaten(1);
        setMealType(getDefaultMealType());
        setServingsForOthers(0);
        setSelectedMembers({});
        setFreezerServings(0);
      }
      fetchInitialData();
    }
  }, [isOpen, recipe]);
  
  // Auto-calculate fridge servings
  useEffect(() => {
    const totalAllocated = servingsEaten + servingsForOthers + freezerServings;
    const remaining = recipe.servings - totalAllocated;
    setFridgeServings(Math.max(0, remaining));
  }, [servingsEaten, servingsForOthers, freezerServings, recipe.servings]);


  const totalServingsDistributed = servingsEaten + servingsForOthers + fridgeServings + freezerServings;
  const isOverallocated = totalServingsDistributed > recipe.servings;
  const unallocatedServings = recipe.servings - totalServingsDistributed;

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
    
    const selectedMemberIds = Object.entries(selectedMembers)
        .filter(([, isSelected]) => isSelected)
        .map(([id]) => id);
    
    const fridgeDestinations: LeftoverDestination[] = fridgeServings > 0 && fridgeLocationId ? [{ locationId: fridgeLocationId, servings: fridgeServings }] : [];
    const freezerDestinations: LeftoverDestination[] = freezerServings > 0 && freezerLocationId ? [{ locationId: freezerLocationId, servings: freezerServings }] : [];

    const result = await handleLogMeal(
        recipe, 
        servingsEaten, 
        mealType, 
        selectedMemberIds, 
        fridgeDestinations, 
        freezerDestinations
    );
    
    setIsPending(false);

    if (result.success && result.newInventory) {
      toast({
        title: "Meal Logged!",
        description: `"${recipe.title}" has been deducted, and leftovers are now in your inventory.`,
      });
      if (servingsForOthers > 0) {
           toast({
                title: "Confirmation Sent",
                description: "Requests have been sent to your household members to confirm their servings.",
           });
      }
      onMealLogged(result.newInventory);
      setIsOpen(false);
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to log meal. Please try again.",
      });
    }
  };

  const SliderGroup = ({ label, value, setValue, max }: { label: string, value: number, setValue: (val: number) => void, max: number}) => (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
            <Label>{label}</Label>
            <Input
                type="number"
                className="w-20 h-8"
                value={value}
                onChange={(e) => setValue(Math.max(0, Math.min(max, Number(e.target.value) || 0)))}
                min={0}
                max={max}
            />
        </div>
        <Slider 
            value={[value]} 
            onValueChange={(vals) => setValue(vals[0])}
            max={max}
            step={1}
        />
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Your Meal: {recipe.title}</DialogTitle>
          <DialogDescription>
            Account for all servings to deduct ingredients and log leftovers. Total made: {recipe.servings} serving{recipe.servings > 1 ? 's' : ''} of ~{recipe.servingSize}.
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
          
          <SliderGroup label="Servings You Ate" value={servingsEaten} setValue={setServingsEaten} max={recipe.servings} />

          {household && otherMembers.length > 0 && (
             <div className="space-y-4 rounded-md border p-4">
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    <h4 className="font-medium">Shared with Household</h4>
                </div>
                <SliderGroup label="Total Servings Eaten by Others" value={servingsForOthers} setValue={setServingsForOthers} max={recipe.servings - servingsEaten} />

                {servingsForOthers > 0 && (
                     <div className="space-y-2">
                        <Label>Select members to notify</Label>
                        <div className="space-y-2">
                            {otherMembers.map(member => (
                                <div key={member.userId} className="flex items-center space-x-2">
                                    <Checkbox 
                                        id={`member-${member.userId}`}
                                        checked={selectedMembers[member.userId] || false}
                                        onCheckedChange={(checked) => setSelectedMembers(prev => ({...prev, [member.userId]: !!checked}))}
                                    />
                                    <Label htmlFor={`member-${member.userId}`} className="font-normal">{member.userName}</Label>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
             </div>
          )}
          
           <div className="space-y-4 rounded-md border p-4">
                <h4 className="font-medium">Store Leftovers</h4>
                 <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label>Servings to Freezer</Label>
                         <Input
                            type="number"
                            className="w-20 h-8"
                            value={freezerServings}
                            onChange={(e) => setFreezerServings(Math.max(0, Math.min(recipe.servings - servingsEaten - servingsForOthers, Number(e.target.value) || 0)))}
                            min={0}
                            max={recipe.servings - servingsEaten - servingsForOthers}
                        />
                    </div>
                    <Slider 
                        value={[freezerServings]} 
                        onValueChange={(vals) => setFreezerServings(vals[0])}
                        max={recipe.servings - servingsEaten - servingsForOthers}
                        step={1}
                    />
                    <Select value={freezerLocationId} onValueChange={setFreezerLocationId} disabled={freezerLocations.length === 0}>
                        <SelectTrigger><SelectValue placeholder={freezerLocations.length > 0 ? "Select freezer..." : "No freezers"} /></SelectTrigger>
                        <SelectContent>
                            {freezerLocations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label className="text-muted-foreground">Servings to Fridge (Auto)</Label>
                        <Input
                            type="number"
                            className="w-20 h-8"
                            value={fridgeServings}
                            readOnly
                            disabled
                        />
                    </div>
                    <Slider 
                        value={[fridgeServings]} 
                        max={recipe.servings}
                        step={1}
                        disabled
                    />
                     <Select value={fridgeLocationId} onValueChange={setFridgeLocationId} disabled={fridgeLocations.length === 0}>
                        <SelectTrigger><SelectValue placeholder={fridgeLocations.length > 0 ? "Select fridge..." : "No fridges"} /></SelectTrigger>
                        <SelectContent>
                            {fridgeLocations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
          </div>
          
          {isOverallocated ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Overallocated</AlertTitle>
              <AlertDescription>
                You have allocated {Math.abs(unallocatedServings)} more serving(s) than were made.
              </AlertDescription>
            </Alert>
          ) : (
             <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Servings Check</AlertTitle>
              <AlertDescription>
                {unallocatedServings} of {recipe.servings} servings are unallocated and will be discarded.
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
