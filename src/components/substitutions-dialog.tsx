
"use client";

import { useState } from "react";
import type { InventoryItem, Recipe, Substitution } from "@/lib/types";
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
import { handleGenerateSubstitutions } from "@/app/actions";
import { Loader2, Sparkles, CheckSquare, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "./ui/checkbox";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";


type Stage = "select" | "loading" | "review";

export function SubstitutionsDialog({
  isOpen,
  setIsOpen,
  recipe,
  inventory,
  onSubstitutionsApplied,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  recipe: Recipe;
  inventory: InventoryItem[];
  onSubstitutionsApplied: (originalRecipeTitle: string, newIngredients: string[]) => void;
}) {
  const { toast } = useToast();
  const [stage, setStage] = useState<Stage>("select");
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<Substitution[]>([]);
  const [finalSelections, setFinalSelections] = useState<Record<string, string>>({});

  const handleCheckboxChange = (ingredient: string, checked: boolean) => {
    setSelectedIngredients(prev =>
      checked ? [...prev, ingredient] : prev.filter(item => item !== ingredient)
    );
  };
  
  const handleSelectionChange = (original: string, replacement: string) => {
    setFinalSelections(prev => ({ ...prev, [original]: replacement }));
  };

  const handleAskAI = async () => {
    if (selectedIngredients.length === 0) {
      toast({
        variant: "destructive",
        title: "No ingredients selected",
        description: "Please select one or more ingredients to find substitutions for.",
      });
      return;
    }
    setStage("loading");
    const result = await handleGenerateSubstitutions(recipe, selectedIngredients, inventory, true);
    if (result.substitutions) {
      setAiSuggestions(result.substitutions);
      // Pre-populate final selections with the first suggestion for each
      const initialSelections = result.substitutions.reduce((acc, sub) => {
        if (sub.suggestedSubstitutions.length > 0) {
          acc[sub.originalIngredient] = sub.suggestedSubstitutions[0].name;
        }
        return acc;
      }, {} as Record<string, string>);
      setFinalSelections(initialSelections);
      setStage("review");
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.error || "Failed to get AI suggestions. Please try again.",
      });
      setStage("select");
    }
  };
  
  const handleApplyChanges = () => {
      const newIngredients = recipe.ingredients.map(original => {
          return finalSelections[original] || original;
      });
      onSubstitutionsApplied(recipe.title, newIngredients);
      setIsOpen(false);
  }

  const renderContent = () => {
    switch (stage) {
      case "loading":
        return (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Asking the AI for ideas...</p>
          </div>
        );
      case "review":
        return (
          <ScrollArea className="h-96 pr-4">
             <div className="space-y-6">
                {aiSuggestions.map(sub => (
                    <div key={sub.originalIngredient} className="space-y-2">
                        <Label className="font-semibold text-base">
                            Replacing: <span className="text-muted-foreground">{sub.originalIngredient}</span>
                        </Label>
                        {sub.suggestedSubstitutions.length > 0 ? (
                             <RadioGroup
                                value={finalSelections[sub.originalIngredient]}
                                onValueChange={(val) => handleSelectionChange(sub.originalIngredient, val)}
                            >
                                {sub.suggestedSubstitutions.map((suggestion) => (
                                    <div key={suggestion.name} className="flex items-start gap-3 rounded-md border p-4">
                                        <RadioGroupItem value={suggestion.name} id={`${sub.originalIngredient}-${suggestion.name}`} className="mt-1"/>
                                        <Label htmlFor={`${sub.originalIngredient}-${suggestion.name}`} className="flex-1 font-normal">
                                            <p className="font-medium text-foreground">{suggestion.name}</p>
                                            <p className="text-sm text-muted-foreground">{suggestion.note}</p>
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        ) : (
                            <Alert variant="destructive">
                                <AlertTitle>No Substitutions Found</AlertTitle>
                                <AlertDescription>The AI could not find a suitable substitution from your inventory for this ingredient.</AlertDescription>
                            </Alert>
                        )}
                    </div>
                ))}
             </div>
          </ScrollArea>
        );
      case "select":
      default:
        return (
          <ScrollArea className="h-96 pr-4">
            <div className="space-y-2">
              {recipe.ingredients.map((ingredient, index) => (
                <div key={index} className="flex items-center space-x-3 rounded-md border p-4">
                  <Checkbox
                    id={`ingredient-${index}`}
                    checked={selectedIngredients.includes(ingredient)}
                    onCheckedChange={(checked) => handleCheckboxChange(ingredient, !!checked)}
                  />
                  <Label htmlFor={`ingredient-${index}`} className="flex-1 font-normal text-sm">
                    {ingredient}
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>
        );
    }
  };

  const renderFooter = () => {
      switch (stage) {
          case "review":
              return (
                 <>
                    <Button variant="ghost" onClick={() => setStage('select')}>Back</Button>
                    <Button onClick={handleApplyChanges}>Apply Changes</Button>
                 </>
              );
          case "select":
              return (
                  <>
                    <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleAskAI} disabled={selectedIngredients.length === 0}>
                        <Sparkles className="mr-2 h-4 w-4" /> Ask AI for Substitutions
                    </Button>
                  </>
              );
          default:
              return <Button variant="ghost" onClick={() => setIsOpen(false)}>Close</Button>;
      }
  }

  return (
      <Dialog open={isOpen} onOpenChange={(open) => {
          if (!open) {
              // Reset state on close
              setStage('select');
              setSelectedIngredients([]);
              setAiSuggestions([]);
              setFinalSelections({});
          }
          setIsOpen(open);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Find Ingredient Substitutions</DialogTitle>
            <DialogDescription>
              {stage === 'select' && "Select the ingredients you'd like to replace, then ask the AI for alternatives."}
              {stage === 'review' && "Review the AI's suggestions and choose the best fit for your recipe."}
            </DialogDescription>
          </DialogHeader>

          {renderContent()}
          
          <DialogFooter>
            {renderFooter()}
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}