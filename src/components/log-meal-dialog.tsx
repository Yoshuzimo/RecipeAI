
"use client";

import { useEffect, useState } from "react";
import type { Recipe, InventoryItem, StorageLocation, LeftoverDestination, HouseholdMember, Household } from "@/lib/types";
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
import { getClientStorageLocations, getClientHousehold } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Loader2, Users } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Separator } from "./ui/separator";
import { Checkbox } from "./ui/checkbox";
import { useAuth } from "./auth-provider";

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
  const { user } = useAuth();
  const [servingsEaten, setServingsEaten] = useState(1);
  const [isPending, setIsPending] = useState(false);
  const [mealType, setMealType] = useState<MealType>("Breakfast");

  const [fridgeDestinations, setFridgeDestinations] = useState<LeftoverDestination[]>([]);
  const [freezerDestinations, setFreezerDestinations] = useState<LeftoverDestination[]>([]);

  const [fridgeLocations, setFridgeLocations] = useState<StorageLocation[]>([]);
  const [freezerLocations, setFreezerLocations] = useState<StorageLocation[]>([]);

  // New state for household functionality
  const [household, setHousehold] = useState<Household | null>(null);
  const [servingsForOthers, setServingsForOthers] = useState(0);
  const [selectedMembers, setSelectedMembers] = useState<Record<string, boolean>>({});

  const otherMembers = household?.activeMembers.filter(m => m.userId !== user?.uid) || [];

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
        
        const initialServingsEaten = 1;
        const remaining = recipe.servings - initialServingsEaten;
        
        setServingsEaten(initialServingsEaten);
        setMealType(getDefaultMealType());
        setServingsForOthers(0);
        setSelectedMembers({});

        // Reset destinations
        const newFridgeDestinations: LeftoverDestination[] = [];
        if (fridges.length > 0) {
          newFridgeDestinations.push({ locationId: fridges[0].id, servings: Math.max(0, remaining) });
        }
        setFridgeDestinations(newFridgeDestinations);
        
        const newFreezerDestinations: LeftoverDestination[] = [];
        if (freezers.length > 0) {
            newFreezerDestinations.push({ locationId: freezers[0].id, servings: 0 });
        }
        setFreezerDestinations(newFreezerDestinations);
      }
      fetchInitialData();
    }
  }, [isOpen, recipe]);
  
  const totalFridgeServings = fridgeDestinations.reduce((sum, dest) => sum + dest.servings, 0);
  const totalFreezerServings = freezerDestinations.reduce((sum, dest) => sum + dest.servings, 0);
  const totalServingsDistributed = servingsEaten + servingsForOthers + totalFridgeServings + totalFreezerServings;
  const remainingServings = recipe.servings - totalServingsDistributed;
  const isOverallocated = remainingServings < 0;

  const handleNumericChange = (value: string, setter: React.Dispatch<React.SetStateAction<number>>) => {
      const num = parseInt(value, 10);
      setter(isNaN(num) || num < 0 ? 0 : num);
  }
  
  const handleDestinationChange = (index: number, field: keyof LeftoverDestination, value: string | number, type: 'fridge' | 'freezer') => {
      const updater = type === 'fridge' ? setFridgeDestinations : setFreezerDestinations;
      updater(prev => {
          const newDests = [...prev];
          const val = field === 'servings' ? (typeof value === 'number' ? value : parseInt(value, 10)) : value;
          newDests[index] = {...newDests[index], [field]: isNaN(val as number) ? 0 : val };
          return newDests;
      });
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
    // Placeholder for AI call
    // This will need a new server action that also creates the confirmation requests
    const result = { success: true, newInventory: [] }; 
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

          {household && otherMembers.length > 0 && (
             <div className="space-y-4 rounded-md border p-4">
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    <h4 className="font-medium">Shared with Household</h4>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="servings-others">Total Servings Eaten by Others</Label>
                    <Input
                        id="servings-others"
                        type="number"
                        value={servingsForOthers}
                        onChange={(e) => handleNumericChange(e.target.value, setServingsForOthers)}
                        min={0}
                    />
                    <p className="text-sm text-muted-foreground">
                        This will send a request to the members you select below to confirm their meal and log their nutrition.
                    </p>
                </div>
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
             {fridgeDestinations.map((dest, index) => (
                <div key={`fridge-${index}`} className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor={`fridge-leftovers-${index}`}>Servings to Fridge</Label>
                        <Input
                        id={`fridge-leftovers-${index}`}
                        type="number"
                        value={dest.servings}
                        onChange={(e) => handleDestinationChange(index, 'servings', e.target.value, 'fridge')}
                        min={0}
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor={`fridge-location-${index}`}>Fridge Location</Label>
                        <Select value={dest.locationId || ''} onValueChange={(val) => handleDestinationChange(index, 'locationId', val, 'fridge')} disabled={fridgeLocations.length === 0}>
                            <SelectTrigger id={`fridge-location-${index}`}><SelectValue placeholder="No fridges..."/></SelectTrigger>
                            <SelectContent>
                                {fridgeLocations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            ))}
             {freezerDestinations.map((dest, index) => (
                <div key={`freezer-${index}`} className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label htmlFor={`freezer-leftovers-${index}`}>Servings to Freezer</Label>
                        <Input
                        id={`freezer-leftovers-${index}`}
                        type="number"
                        value={dest.servings}
                        onChange={(e) => handleDestinationChange(index, 'servings', e.target.value, 'freezer')}
                        min={0}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor={`freezer-location-${index}`}>Freezer Location</Label>
                         <Select value={dest.locationId || ''} onValueChange={(val) => handleDestinationChange(index, 'locationId', val, 'freezer')} disabled={freezerLocations.length === 0}>
                            <SelectTrigger id={`freezer-location-${index}`}><SelectValue placeholder="No freezers..."/></SelectTrigger>
                            <SelectContent>
                                {freezerLocations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            ))}
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

    
