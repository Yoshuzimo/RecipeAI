
"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { InventoryItem } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "./ui/label";

const usUnits = [
  "pcs", "tsp", "tbsp", "fl oz", "cup", "pint", "quart", "gallon", "oz", "lbs"
];
const metricUnits = ["pcs", "ml", "l", "g", "kg"];

export function AddIngredientDialog({
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
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [searchTerm, setSearchTerm] = useState("");
  // In a real app, this would come from user settings
  const [unitSystem, setUnitSystem] = useState<"us" | "metric">("us"); 

  const availableUnits = unitSystem === "us" ? usUnits : metricUnits;

  useEffect(() => {
    if (isOpen) {
        // Reset state when dialog opens
        setStep(1);
        setIngredientName("");
        setQuantity("");
        setUnit(unitSystem === "us" ? "pcs" : "g");
        setSearchTerm("");
    }
  }, [isOpen, unitSystem]);

  const filteredInventory = useMemo(() => {
    if (!searchTerm) return [];
    return inventory
      .filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .slice(0, 5); // Limit to 5 suggestions
  }, [searchTerm, inventory]);

  const handleSelectFromList = (name: string) => {
    setIngredientName(name);
    setSearchTerm(name); // Also update search term to keep it in sync
  };
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
      setIngredientName(e.target.value);
  }

  const handleNext = () => {
    if (ingredientName.trim()) {
      setStep(2);
    }
  };

  const handleDone = () => {
    const finalQuantity = quantity.trim() || "1";
    const finalIngredient = `${finalQuantity} ${unit} ${ingredientName.trim()}`;
    onAddIngredient(finalIngredient);
    setIsOpen(false);
  };
  
  const handleBack = () => {
      setStep(1);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Ingredient</DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Search for an ingredient or type a new one."
              : "Specify the quantity and unit."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-2">
            <Input
              placeholder="e.g., Flour, Chicken, etc."
              value={searchTerm}
              onChange={handleNameChange}
              autoFocus
            />
            {filteredInventory.length > 0 && (
              <ScrollArea className="h-40 rounded-md border">
                <div className="p-2">
                  {filteredInventory.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectFromList(item.name)}
                      className="p-2 rounded-md hover:bg-accent cursor-pointer"
                    >
                      {item.name}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
        
        {step === 2 && (
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                        id="quantity"
                        placeholder="e.g., 1.5, 1/2"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        autoFocus
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Select value={unit} onValueChange={setUnit}>
                        <SelectTrigger id="unit">
                            <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableUnits.map(u => (
                                <SelectItem key={u} value={u}>{u}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        )}

        <DialogFooter>
          {step === 1 ? (
            <>
              <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button onClick={handleNext} disabled={!ingredientName.trim()}>Next</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={handleBack}>Back</Button>
              <Button onClick={handleDone}>Done</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
