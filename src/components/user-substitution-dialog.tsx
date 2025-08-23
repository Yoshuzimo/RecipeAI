
"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Replace } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Recipe, InventoryItem } from "@/lib/types";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";


export function UserSubstitutionDialog({
  isOpen,
  setIsOpen,
  recipe,
  inventory,
  onSubstitution,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  recipe: Recipe;
  inventory: InventoryItem[];
  onSubstitution: (recipe: Recipe, original: string, newIngredient: string) => void;
}) {
  const [step, setStep] = useState<"select_original" | "select_new">("select_original");
  const [originalIngredient, setOriginalIngredient] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [newIngredient, setNewIngredient] = useState<string | null>(null);

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [inventory, searchTerm]);

  const handleSelectOriginal = (ingredient: string) => {
    setOriginalIngredient(ingredient);
    setStep("select_new");
  };

  const handleSelectNew = (item: InventoryItem) => {
    setNewIngredient(`${item.totalQuantity} ${item.unit} ${item.name}`);
  }
  
  const handleConfirm = () => {
    if (originalIngredient && newIngredient) {
        onSubstitution(recipe, originalIngredient, newIngredient);
        setIsOpen(false);
        // Reset state for next time
        setStep("select_original");
        setOriginalIngredient(null);
        setNewIngredient(null);
        setSearchTerm("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Substitute Ingredient</DialogTitle>
          <DialogDescription>
            {step === 'select_original' 
                ? "Select an ingredient from the recipe to replace." 
                : `Replacing "${originalIngredient}". Select an item from your inventory.`
            }
          </DialogDescription>
        </DialogHeader>
        
        {step === 'select_original' && (
             <ScrollArea className="h-72 my-4">
                <div className="space-y-2 pr-4">
                    {recipe.ingredients.map((ing, i) => (
                        <Button 
                            key={i} 
                            variant="outline" 
                            className="w-full justify-start"
                            onClick={() => handleSelectOriginal(ing)}
                        >
                            {ing}
                        </Button>
                    ))}
                </div>
            </ScrollArea>
        )}

        {step === 'select_new' && (
            <div className="space-y-4 py-4">
                <Input 
                    placeholder="Search your inventory..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <ScrollArea className="h-60">
                    <div className="space-y-2 pr-4">
                        {filteredInventory.map(item => (
                            <Button
                                key={item.id}
                                variant="outline"
                                className={cn("w-full justify-start", newIngredient?.includes(item.name) && "border-primary")}
                                onClick={() => handleSelectNew(item)}
                            >
                                {item.name} <span className="text-muted-foreground ml-auto">{item.totalQuantity} {item.unit}</span>
                            </Button>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!newIngredient}>
            <Replace className="mr-2 h-4 w-4" />
            Confirm Substitution
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
