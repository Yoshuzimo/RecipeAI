
"use client";

import { useEffect, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { handleGenerateSubstitutions } from "@/app/actions";
import { Loader2, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { useRateLimiter } from "@/hooks/use-rate-limiter.tsx";

enum SubstitutionMode {
  None,
  Ai,
  Inventory,
}

export function SubstitutionsDialog({
  isOpen,
  setIsOpen,
  recipe,
  inventory,
  onSubstitutionsApplied,
  initialIngredients = [],
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  recipe: Recipe;
  inventory: InventoryItem[];
  onSubstitutionsApplied: (updatedRecipe: Recipe) => void;
  initialIngredients?: string[];
}) {
  const { isRateLimited, timeToWait, checkRateLimit, recordRequest } = useRateLimiter();
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>(initialIngredients);
  const [mode, setMode] = useState<SubstitutionMode>(SubstitutionMode.None);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<Substitution[] | null>(null);
  const [userSelections, setUserSelections] = useState<Record<string, string>>({});
  const [allowExternalSuggestions, setAllowExternalSuggestions] = useState(false);


  useEffect(() => {
    // If there are initial ingredients, go straight to AI suggestions
    if (initialIngredients.length > 0) {
      handleGenerateAiSubstitutions();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialIngredients]);

  const handleSelectIngredient = (ingredient: string) => {
    setSelectedIngredients((prev) =>
      prev.includes(ingredient)
        ? prev.filter((i) => i !== ingredient)
        : [...prev, ingredient]
    );
  };
  
  const handleGenerateAiSubstitutions = async () => {
    if (selectedIngredients.length === 0) return;
    if (!checkRateLimit()) return;

    setIsLoading(true);
    setError(null);
    setAiSuggestions(null);
    setMode(SubstitutionMode.Ai);
    
    recordRequest();
    const result = await handleGenerateSubstitutions(recipe, selectedIngredients, inventory, allowExternalSuggestions);
    if (result.error) {
        setError(result.error);
    } else {
        setAiSuggestions(result.substitutions);
    }
    setIsLoading(false);
  };

  const handleUserSelection = (originalIngredient: string, substitution: string) => {
      setUserSelections(prev => ({...prev, [originalIngredient]: substitution}));
  }

  const handleSubmit = () => {
    // Create a map of original ingredients to their substitutions
    const substitutionMap = new Map(Object.entries(userSelections));
    
    // Create the new ingredients list
    const newIngredients = recipe.ingredients.map(ing => {
      // If the current ingredient has a selected substitution, use it
      if (substitutionMap.has(ing)) {
        return substitutionMap.get(ing)!;
      }
      // Otherwise, keep the original ingredient
      return ing;
    });

    const updatedRecipe = { ...recipe, ingredients: newIngredients };
    onSubstitutionsApplied(updatedRecipe);
    setIsOpen(false);
  };

  const renderContent = () => {
    if (isLoading) {
        return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    if (error) {
        return (
             <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )
    }

    if (mode === SubstitutionMode.Ai && aiSuggestions) {
      const suggestionsWithContent = aiSuggestions.filter(s => s.suggestedSubstitutions.length > 0);
      const suggestionsWithoutContent = aiSuggestions.filter(s => s.suggestedSubstitutions.length === 0);

      return (
        <div className="space-y-4">
          {suggestionsWithContent.map(suggestion => (
            <Card key={suggestion.originalIngredient}>
                <CardHeader>
                    <CardTitle>Substitutions for <span className="text-primary">{suggestion.originalIngredient}</span></CardTitle>
                </CardHeader>
                <CardContent>
                    <RadioGroup onValueChange={(value) => handleUserSelection(suggestion.originalIngredient, value)}>
                        <div className="space-y-2">
                        {suggestion.suggestedSubstitutions.map(sub => (
                            <div key={sub} className="flex items-center space-x-2">
                                <RadioGroupItem value={sub} id={`${suggestion.originalIngredient}-${sub}`} />
                                <Label htmlFor={`${suggestion.originalIngredient}-${sub}`}>{sub}</Label>
                            </div>
                        ))}
                        </div>
                    </RadioGroup>
                </CardContent>
            </Card>
          ))}
          {suggestionsWithoutContent.length > 0 && (
             <Card className="border-dashed">
                <CardHeader>
                    <CardTitle>No Substitutions Found</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">No suitable substitutions were found in your inventory for the following items:</p>
                     <ul className="list-disc list-inside mt-2">
                        {suggestionsWithoutContent.map(s => <li key={s.originalIngredient}>{s.originalIngredient}</li>)}
                    </ul>
                    <div className="flex items-center space-x-2 mt-4">
                        <Checkbox
                            id="allowExternal"
                            checked={allowExternalSuggestions}
                            onCheckedChange={(checked) => setAllowExternalSuggestions(!!checked)}
                        />
                        <Label htmlFor="allowExternal" className="text-sm">
                           Allow suggesting items not in my inventory?
                        </Label>
                    </div>
                     <Button onClick={handleGenerateAiSubstitutions} className="mt-4" disabled={isRateLimited}>
                        {isRateLimited ? (
                            `Please wait (${timeToWait}s)`
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Regenerate
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
          )}
        </div>
      );
    }
    
    // Initial selection screen
    return (
        <div className="space-y-4">
            {recipe.ingredients.map((ingredient) => (
                <div key={ingredient} className="flex items-center space-x-3">
                    <Checkbox
                    id={`sub-${ingredient}`}
                    onCheckedChange={() => handleSelectIngredient(ingredient)}
                    checked={selectedIngredients.includes(ingredient)}
                    />
                    <Label htmlFor={`sub-${ingredient}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {ingredient}
                    </Label>
                </div>
            ))}
        </div>
    );

  };

  const isSubmitDisabled = () => {
    if (mode === SubstitutionMode.Ai) {
        // Must have made a selection for each ingredient that was requested for substitution
        return Object.keys(userSelections).length !== selectedIngredients.length;
    }
    return true; // Disabled for other modes for now
  };


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Make Substitutions for {recipe.title}</DialogTitle>
          <DialogDescription>
            {mode === SubstitutionMode.None ? "Select the ingredients you want to replace." : "Choose a replacement for each ingredient."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-96 pr-6 my-4">
            {isRateLimited && mode !== SubstitutionMode.None ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                    <p className="text-lg font-semibold">You're doing that a bit too fast!</p>
                    <p className="text-muted-foreground">Please wait a moment before trying again.</p>
                    <p className="text-4xl font-bold my-4">{timeToWait}</p>
                    {timeToWait === 0 && (
                        <Button onClick={handleGenerateAiSubstitutions}>
                            <RefreshCw className="mr-2 h-4 w-4"/>
                            Try Again
                        </Button>
                    )}
                </div>
            ) : (
                renderContent()
            )}
        </ScrollArea>
        
        <DialogFooter className="gap-2 sm:justify-between">
            {mode === SubstitutionMode.None ? (
                 <>
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="allowExternal"
                            checked={allowExternalSuggestions}
                            onCheckedChange={(checked) => setAllowExternalSuggestions(!!checked)}
                        />
                        <Label htmlFor="allowExternal" className="text-sm">
                           Suggest items not in my inventory
                        </Label>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <Button onClick={handleGenerateAiSubstitutions} disabled={selectedIngredients.length === 0 || isLoading || isRateLimited}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isRateLimited ? `Please wait (${timeToWait}s)` : <Sparkles className="mr-2 h-4 w-4" />}
                            {isLoading ? "Generating..." : isRateLimited ? `Wait (${timeToWait}s)` : "Get Suggestions"}
                        </Button>
                    </div>
                </>
            ) : (
                <>
                    <Button variant="outline" onClick={() => {
                      setMode(SubstitutionMode.None);
                      setUserSelections({});
                      setAiSuggestions(null);
                    }}>Back</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitDisabled()}>
                        Apply Substitutions
                    </Button>
                </>
            )}

        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
