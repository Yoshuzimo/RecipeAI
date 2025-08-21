
"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "./ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { handleGenerateRecipeDetails } from "@/app/actions";
import type { InventoryItem, Recipe } from "@/lib/types";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { AddIngredientDialog } from "./add-ingredient-dialog";


const formSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters."),
    description: z.string().optional(),
    ingredients: z.array(z.object({
        value: z.string().min(1, "Ingredient cannot be empty.")
    })).min(1, "You must add at least one ingredient."),
    instructions: z.string().min(10, "Instructions must be at least 10 characters long."),
});

type FormData = z.infer<typeof formSchema>;

export function CreateRecipeDialog({
    isOpen,
    setIsOpen,
    inventory,
    onRecipeCreated,
}: {
    isOpen: boolean,
    setIsOpen: (isOpen: boolean) => void,
    inventory: InventoryItem[],
    onRecipeCreated: (recipe: Recipe) => void,
}) {
    const { toast } = useToast();
    const [isPending, setIsPending] = useState(false);
    const [isAddIngredientOpen, setIsAddIngredientOpen] = useState(false);

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            description: "",
            ingredients: [],
            instructions: "",
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "ingredients",
    });
    
    const handleAddIngredient = (ingredient: string) => {
        append({ value: ingredient });
    };


    const onSubmit = async (data: FormData) => {
        setIsPending(true);
        const instructionsArray = data.instructions.split('\n').filter(line => line.trim() !== '');
        const ingredientArray = data.ingredients.map(ing => ing.value);

        const result = await handleGenerateRecipeDetails({
            title: data.title,
            description: data.description || "",
            ingredients: ingredientArray,
            instructions: instructionsArray,
        });

        if (result.recipe) {
            toast({
                title: "Recipe Finalized!",
                description: `We've calculated the servings and nutritional info for "${result.recipe.title}".`
            });
            onRecipeCreated(result.recipe);
            setIsOpen(false);
            form.reset();
        } else {
            toast({
                variant: "destructive",
                title: "Error",
                description: result.error || "Failed to finalize recipe. Please try again."
            });
        }
        setIsPending(false);
    }
    
    return (
        <>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Create a New Meal</DialogTitle>
                    <DialogDescription>
                        Enter your recipe details below. We'll use AI to calculate servings and nutrition.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <ScrollArea className="h-96 pr-6">
                            <div className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Recipe Title</FormLabel>
                                            <FormControl><Input placeholder="e.g., Spicy Chicken Tacos" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description (Optional)</FormLabel>
                                            <FormControl><Textarea placeholder="A short, enticing description of your creation." {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="space-y-2">
                                     <FormLabel>Ingredients</FormLabel>
                                     <div className="space-y-2">
                                        {fields.map((field, index) => (
                                            <div key={field.id} className="flex items-center gap-2">
                                                <Input
                                                    {...form.register(`ingredients.${index}.value`)}
                                                    className="flex-1"
                                                    placeholder="e.g., 1 cup flour"
                                                />
                                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                     </div>
                                     {form.formState.errors.ingredients?.root && (
                                         <p className="text-sm font-medium text-destructive">{form.formState.errors.ingredients.root.message}</p>
                                     )}
                                     <Button type="button" variant="outline" className="w-full" onClick={() => setIsAddIngredientOpen(true)}>
                                        <PlusCircle className="mr-2 h-4 w-4" /> Add Ingredient
                                    </Button>
                                </div>
                                <FormField
                                    control={form.control}
                                    name="instructions"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Instructions</FormLabel>
                                            <FormControl><Textarea placeholder="1. Chop vegetables.\n2. Sauté chicken...\n3. Serve hot." {...field} rows={6} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </ScrollArea>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Finalize Recipe
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
        <AddIngredientDialog
            isOpen={isAddIngredientOpen}
            setIsOpen={setIsAddIngredientOpen}
            inventory={inventory}
            onAddIngredient={handleAddIngredient}
        />
        </>
    );
}