
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Recipe, InventoryItem, PersonalDetails, AISuggestion } from "@/lib/types";
import { generateSubstitutions } from "@/ai/flows/generate-substitutions";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { Card, CardContent } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";


export function AISubstitutionDialog({
  isOpen,
  setIsOpen,
  recipe,
  ingredientToReplace,
  inventory,
  personalDetails,
  onSubstitution,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  recipe: Recipe;
  ingredientToReplace: string;
  inventory: InventoryItem[];
  personalDetails: PersonalDetails;
  onSubstitution: (recipe: Recipe, original: string, newIngredient: string) => void;
}) {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(true);
  const [substitutions, setSubstitutions] = useState<AISuggestion[]>([]);
  const [selectedValue, setSelectedValue] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      async function fetchSubstitutions() {
        setIsPending(true);
        const result = await generateSubstitutions({
          recipe,
          ingredientToReplace,
          inventory,
          personalDetails,
        });

        if ('error' in result) {
          toast({
            variant: "destructive",
            title: "AI Error",
            description: result.error || "Could not fetch substitutions.",
          });
          setSubstitutions([]);
        } else {
          setSubstitutions(result.suggestedSubstitutions);
        }
        setIsPending(false);
      }
      fetchSubstitutions();
    }
  }, [isOpen, recipe, ingredientToReplace, inventory, personalDetails, toast]);
  
  const handleConfirm = () => {
    if (selectedValue) {
        onSubstitution(recipe, ingredientToReplace, selectedValue);
        setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>AI Substitutions for <span className="text-primary">{ingredientToReplace}</span></DialogTitle>
          <DialogDescription>
            Our AI has suggested a few alternatives. Select one to update your recipe.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
            {isPending ? (
                <div className="flex flex-col items-center justify-center h-48 space-y-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-muted-foreground">Thinking of some tasty swaps...</p>
                </div>
            ) : substitutions.length > 0 ? (
                <ScrollArea className="h-72">
                    <RadioGroup value={selectedValue} onValueChange={setSelectedValue} className="space-y-4 pr-4">
                        {substitutions.map((sub, index) => (
                            <Card key={index}>
                                <CardContent className="p-4 flex items-center space-x-4">
                                    <RadioGroupItem value={sub.name} id={`sub-${index}`} />
                                    <Label htmlFor={`sub-${index}`} className="flex-1 space-y-1 cursor-pointer">
                                        <p className="font-semibold">{sub.name}</p>
                                        <p className="text-sm text-muted-foreground font-normal">{sub.note}</p>
                                    </Label>
                                </CardContent>
                            </Card>
                        ))}
                    </RadioGroup>
                </ScrollArea>
            ) : (
                <div className="text-center text-muted-foreground h-48 flex flex-col justify-center items-center">
                    <p>Sorry, the AI couldn't come up with any substitutions right now.</p>
                </div>
            )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={isPending || !selectedValue}>
            Confirm Substitution
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

