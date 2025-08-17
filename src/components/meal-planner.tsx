"use client";

import { useActionState, useFormStatus } from "react-dom";
import { handleGenerateSuggestions } from "@/app/actions";
import type { InventoryItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import React from "react";

const initialState = {
  suggestions: null,
  error: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" />
          Generate Suggestions
        </>
      )}
    </Button>
  );
}

export function MealPlanner({ inventory }: { inventory: InventoryItem[] }) {
  const handleGenerateSuggestionsWithInventory = handleGenerateSuggestions.bind(null, inventory);
  const [state, formAction] = React.useActionState(handleGenerateSuggestionsWithInventory, initialState);

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>What are you in the mood for?</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div>
              <Label htmlFor="dietaryPreferences">
                Dietary Preferences or Cravings
              </Label>
              <Input
                id="dietaryPreferences"
                name="dietaryPreferences"
                placeholder="e.g., vegetarian, low-carb, spicy thai curry"
                className="mt-1"
              />
              {state?.error?.dietaryPreferences && (
                <p className="text-sm font-medium text-destructive mt-1">
                  {state.error.dietaryPreferences[0]}
                </p>
              )}
            </div>
            <SubmitButton />
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">AI Suggestions</h2>
        {useFormStatus().pending ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
               <Card key={i}>
                <CardHeader>
                   <Skeleton className="h-6 w-3/4" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : state.suggestions ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {state.suggestions.map((suggestion, index) => (
              <Card key={index} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">{suggestion.split(':')[0]}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-muted-foreground">{suggestion.substring(suggestion.indexOf(':') + 1).trim()}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 border-2 border-dashed rounded-lg">
            <Sparkles className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">No suggestions yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your preferences above to get some delicious meal ideas!
            </p>
          </div>
        )}
        {state.error && !state.error.dietaryPreferences && (
           <p className="text-sm font-medium text-destructive mt-2">{state.error.toString()}</p>
        )}
      </div>
    </div>
  );
}
