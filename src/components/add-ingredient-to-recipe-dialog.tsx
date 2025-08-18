
"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { InventoryItem, Unit } from "@/lib/types";
import { Input } from "./ui/input";
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
  setIsOpen: (open: boolean) => void;
  inventory: InventoryItem[];
  onAddIngredient: (ingredient: string) => void;
}) {
    const [step, setStep] = useState(1);
    const [ingredientName, setIngredientName] = useState("");
    const [quantity, setQuantity] = useState("1");
    const [unit, setUnit] = useState<Unit>("pcs");
    const [availableUnits, setAvailableUnits] = useState(usUnits);

    useEffect(() => {
        if (isOpen) {
            // Reset state when dialog opens
            setStep(1);
            setIngredientName("");
            setQuantity("1");
            getUnitSystem().then(system => {
                const units = system === 'us' ? usUnits : metricUnits;
                setAvailableUnits(units);
                setUnit(units.find(u => u.value === 'pcs') ? 'pcs' : units[0].value);
            });
        }
    }, [isOpen]);

    const handleSelect = (name: string) => {
        setIngredientName(name);
        setStep(2);
    };

    const handleAdd = () => {
        if (ingredientName.trim() === "") return;
        
        const fullIngredient = `${quantity} ${unit} ${ingredientName}`;
        onAddIngredient(fullIngredient);
        setIsOpen(false);
    };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? "Add Ingredient" : `How much ${ingredientName}?`}
          </DialogTitle>
           <DialogDescription>
            {step === 1 
                ? "Search for an item in your inventory or type a new one." 
                : "Specify the quantity and unit for your recipe."}
          </DialogDescription>
        </DialogHeader>
        {step === 1 ? (
          <Command shouldFilter={false} className="mt-4">
            <CommandInput 
                placeholder="Search inventory or add new..." 
                value={ingredientName}
                onValueChange={setIngredientName}
            />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup>
                {inventory
                    .filter(item => item.name.toLowerCase().includes(ingredientName.toLowerCase()))
                    .map((item) => (
                    <CommandItem
                        key={item.id}
                        value={item.name}
                        onSelect={handleSelect}
                    >
                        {item.name}
                    </CommandItem>
                    ))}
                </CommandGroup>
            </CommandList>
            <DialogFooter className="pt-4">
                <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button onClick={() => setStep(2)} disabled={!ingredientName.trim()}>
                    Next
                </Button>
            </DialogFooter>
          </Command>
        ) : (
            <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input 
                            id="quantity" 
                            value={quantity} 
                            onChange={(e) => setQuantity(e.target.value)} 
                            placeholder="e.g., 2"
                        />
                     </div>
                     <div className="space-y-2">
                        <Label htmlFor="unit">Unit</Label>
                        <Select value={unit} onValueChange={(value: Unit) => setUnit(value)}>
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
                    <Button onClick={handleAdd}>Add Ingredient</Button>
                </DialogFooter>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
