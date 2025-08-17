
"use client";

import { Bookmark } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";

export function SavedRecipes() {
  return (
    <div className="space-y-8">
        <div className="flex items-center justify-between space-y-2">
            <div>
            <h1 className="text-3xl font-bold tracking-tight">Saved Recipes</h1>
            <p className="text-muted-foreground">
                Your collection of favorite and custom recipes.
            </p>
            </div>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle>My Recipe Book</CardTitle>
                <CardDescription>
                    Here you can find all the recipes you've saved from AI suggestions or created yourself.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="text-center py-20 border-2 border-dashed rounded-lg">
                    <Bookmark className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">No saved recipes yet</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Come back here after you've saved some recipes!
                    </p>
                </div>
            </CardContent>
        </Card>

    </div>
  );
}
