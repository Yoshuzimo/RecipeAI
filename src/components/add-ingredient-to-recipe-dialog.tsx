
"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import type { InventoryItem, Unit } from "@/lib/types";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { getUnitSystem } from "@/lib/data";

const metricUnits: { value: Unit, label: string }[] = [
    { value: 'g', label: 'Grams (g)' },
    { value: 'kg', label: 'Kilograms (kg)' },
    { value: 'ml', label: 'Milliliters (ml)' },
    { value: 'l', label: 'Liters (l)' },
    { value: 'pcs', label: 'Pieces (pcs)' },
];

const usUnits: { value: Unit, label: string }[] = [
    { value: 'oz', label: 'Ounces (oz)' },
    { value: 'lbs', label: 'Pounds (lbs)' },
    { value: 'fl oz', label: 'Fluid Ounces (fl oz)' },
    { value: 'gallon', label: 'Gallons' },
    { value: 'pcs', label: 'Pieces (pcs)' },
];

export function AddIngredientToRecipeDialog({
  isOpen,
  setIsOpen,
  inventory,
  onAddIngredient,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  inventory: InventoryItem[];
  onAddIngredient: (ingredient: string) => void;
}) {
  const [step, setStep] = useState(1);
  const [ingredientName, setIngredientName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState<Unit>("pcs");

  const [availableUnits, setAvailableUnits] = useState(usUnits);

  useState(() => {
    async function fetchUnits() {
        const system = await getUnitSystem();
        const units = system === 'us' ? usUnits : metricUnits;
        setAvailableUnits(units);
        setUnit(units.find(u => u.value === 'pcs') ? 'pcs' : units[0].value);
    }
    fetchUnits();
  });


  const filteredInventory = useMemo(() => {
    if (!ingredientName) return inventory;
    return inventory.filter(item =>
      item.name.toLowerCase().includes(ingredientName.toLowerCase())
    );
  }, [ingredientName, inventory]);

  const handleSelect = (name: string) => {
    setIngredientName(name);
    setStep(2);
  };
  
  const handleNext = () => {
    if (ingredientName.trim()) {
        setStep(2);
    }
  }

  const handleDone = () => {
    const formattedIngredient = `${quantity} ${unit} ${ingredientName}`;
    onAddIngredient(formattedIngredient);
    handleClose();
  };
  
  const handleClose = () => {
    setStep(1);
    setIngredientName("");
    setQuantity("1");
    setUnit("pcs");
    setIsOpen(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) handleClose();
        else setIsOpen(true);
    }}>
      <DialogContent className="max-w-md">
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle>Add Ingredient</DialogTitle>
              <DialogDescription>
                Search your inventory or type a new ingredient.
              </DialogDescription>
            </DialogHeader>
            <Command shouldFilter={false} className="overflow-visible">
                <CommandInput
                    placeholder="Search inventory or type new..."
                    value={ingredientName}
                    onValueChange={setIngredientName}
                />
                <ScrollArea className="h-48">
                    <CommandList>
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup>
                            {filteredInventory.map(item => (
                                <CommandItem
                                    key={item.id}
                                    value={item.name}
                                    onSelect={() => handleSelect(item.name)}
                                >
                                    {item.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </ScrollArea>
            </Command>
             <DialogFooter>
                <Button variant="ghost" onClick={handleClose}>Cancel</Button>
                <Button onClick={handleNext} disabled={!ingredientName.trim()}>Next</Button>
            </DialogFooter>
          </>
        )}
        {step === 2 && (
           <>
            <DialogHeader>
              <DialogTitle>Set Quantity for {ingredientName}</DialogTitle>
              <DialogDescription>
                Specify the amount and unit for this ingredient.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input id="quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Select value={unit} onValueChange={(val: Unit) => setUnit(val)}>
                        <SelectTrigger id="unit">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                             {availableUnits.map(u => (
                                <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                 </div>
            </div>
             <DialogFooter>
                <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={handleDone}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
