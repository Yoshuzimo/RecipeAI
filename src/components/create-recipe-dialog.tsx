
"use client";

import { useState, useMemo } from "react";
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
import type { InventoryItem, Recipe, Macros, DetailedFats } from "@/lib/types";
import { Loader2, PlusCircle, Trash2, Lock, ChevronDown } from "lucide-react";
import { AddIngredientDialog } from "./add-ingredient-dialog";
import { finalizeRecipe } from "@/ai/flows/finalize-recipe";
import { Switch } from "./ui/switch";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "./ui/collapsible";
import { ConfirmNutritionDialog } from "./confirm-nutrition-dialog";
import { Card } from "./ui/card";

const formSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters."),
    description: z.string().optional(),
    ingredients: z.array(z.object({
        value: z.string().min(1, "Ingredient cannot be empty.")
    })).min(1, "You must add at least one ingredient."),
    instructions: z.string().min(10, "Instructions must be at least 10 characters long."),
    isPrivate: z.boolean().default(false),
    nutrition: z.object({
        calories: z.coerce.number().min(0).optional(),
        protein: z.coerce.number().min(0).optional(),
        carbs: z.coerce.number().min(0).optional(),
        fat: z.coerce.number().min(0).optional(),
        fiber: z.coerce.number().min(0).optional(),
        sugar: z.coerce.number().min(0).optional(),
        sodium: z.coerce.number().min(0).optional(),
        cholesterol: z.coerce.number().min(0).optional(),
        saturatedFat: z.coerce.number().min(0).optional(),
        monounsaturatedFat: z.coerce.number().min(0).optional(),
        polyunsaturatedFat: z.coerce.number().min(0).optional(),
        transFat: z.coerce.number().min(0).optional(),
  }).optional(),
});

type FormData = z.infer<typeof formSchema>;
type PartialMacros = Partial<Macros & { fats: Partial<DetailedFats> }>;

function detectConflicts(userMacros: PartialMacros, aiMacros: Macros): boolean {
    if (!userMacros) return false;
    for (const key in userMacros) {
        if (key === 'fats') continue; // Handle fats separately
        const userVal = userMacros[key as keyof Macros];
        const aiVal = aiMacros[key as keyof Macros];
        if (userVal !== undefined && aiVal !== undefined) {
            // Allow a 10% tolerance for calorie conflicts, 5% for others
            const tolerance = key === 'calories' ? 0.10 : 0.05;
            if (Math.abs(userVal - aiVal) > (aiVal * tolerance)) {
                return true;
            }
        }
    }
    if (userMacros.fats) {
        for (const key in userMacros.fats) {
            const userVal = userMacros.fats[key as keyof DetailedFats];
            const aiVal = aiMacros.fats?.[key as keyof DetailedFats];
            if (userVal !== undefined && aiVal !== undefined) {
                if (Math.abs(userVal - aiVal) > 1) { // Low tolerance for specific fats
                     return true;
                }
            }
        }
    }
    return false;
}

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
    const [activeInputIndex, setActiveInputIndex] = useState<number | null>(null);

    // State for conflict resolution
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [conflictData, setConflictData] = useState<{ user: PartialMacros, ai: Macros, recipeData: Omit<Recipe, 'macros' | 'servings'> & {servings: number, servingSize: string} } | null>(null);

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            description: "",
            ingredients: [],
            instructions: "",
            isPrivate: false,
            nutrition: {},
        },
    });

    const { fields, append, remove, update } = useFieldArray({
        control: form.control,
        name: "ingredients",
    });

    const watchedIngredients = form.watch("ingredients");

    const filteredSuggestions = useMemo(() => {
        if (activeInputIndex === null || !watchedIngredients[activeInputIndex]?.value) {
            return [];
        }
        const searchTerm = watchedIngredients[activeInputIndex].value.toLowerCase();
        if (searchTerm.length < 2) return [];

        const uniqueNames = new Set<string>();
        return inventory
            .filter(item => {
                const name = item.name.toLowerCase();
                if (name.includes(searchTerm) && !uniqueNames.has(name)) {
                    uniqueNames.add(name);
                    return true;
                }
                return false;
            })
            .slice(0, 5);
    }, [activeInputIndex, watchedIngredients, inventory]);
    
    const handleSuggestionClick = (item: InventoryItem) => {
        if (activeInputIndex !== null) {
            update(activeInputIndex, { value: item.name });
            setActiveInputIndex(null); // Close suggestions
        }
    };
    
    const handleAddIngredient = (ingredient: string) => {
        append({ value: ingredient });
    };

    const finishRecipeCreation = (finalRecipe: Recipe) => {
        toast({
            title: "Recipe Finalized!",
            description: `We've calculated the servings and nutritional info for "${finalRecipe.title}".`
        });
        onRecipeCreated(finalRecipe);
        setIsOpen(false);
        form.reset();
    };

    const onSubmit = async (data: FormData) => {
        setIsPending(true);
        const instructionsArray = data.instructions.split('\n').filter(line => line.trim() !== '');
        const ingredientArray = data.ingredients.map(ing => ing.value);

        const userMacros: PartialMacros = {};
        if (data.nutrition) {
            if (data.nutrition.calories) userMacros.calories = data.nutrition.calories;
            if (data.nutrition.protein) userMacros.protein = data.nutrition.protein;
            if (data.nutrition.carbs) userMacros.carbs = data.nutrition.carbs;
            if (data.nutrition.fat) userMacros.fat = data.nutrition.fat;
            if (data.nutrition.fiber) userMacros.fiber = data.nutrition.fiber;
            if (data.nutrition.sugar) userMacros.sugar = data.nutrition.sugar;
            if (data.nutrition.sodium) userMacros.sodium = data.nutrition.sodium;
            if (data.nutrition.cholesterol) userMacros.cholesterol = data.nutrition.cholesterol;
            
            const userFats: Partial<DetailedFats> = {};
            if (data.nutrition.saturatedFat) userFats.saturated = data.nutrition.saturatedFat;
            if (data.nutrition.monounsaturatedFat) userFats.monounsaturated = data.nutrition.monounsaturatedFat;
            if (data.nutrition.polyunsaturatedFat) userFats.polyunsaturated = data.nutrition.polyunsaturatedFat;
            if (data.nutrition.transFat) userFats.trans = data.nutrition.transFat;
            if (Object.keys(userFats).length > 0) userMacros.fats = userFats;
        }

        const result = await finalizeRecipe({
            title: data.title,
            ingredients: ingredientArray,
            instructions: instructionsArray,
            macros: userMacros,
        });

        setIsPending(false);

        if ('error' in result) {
            toast({
                variant: "destructive",
                title: "Error Finalizing Recipe",
                description: result.error || "Failed to finalize recipe. Please try again."
            });
        } else {
             const recipeBase = {
                title: data.title,
                description: data.description || "A custom recipe.",
                isPrivate: data.isPrivate,
                ingredients: ingredientArray,
                instructions: instructionsArray,
                servings: result.servings,
                servingSize: result.servingSize,
            };
            
            if (Object.keys(userMacros).length > 0 && detectConflicts(userMacros, result.macros)) {
                // Conflict detected, open the confirmation dialog
                setConflictData({ user: userMacros, ai: result.macros, recipeData: recipeBase });
                setIsConfirmOpen(true);
            } else {
                // No conflict or no user input, auto-merge and finish
                const finalMacros = { ...result.macros, ...userMacros };
                 if (userMacros.fats) {
                    finalMacros.fats = { ...result.macros.fats, ...userMacros.fats };
                }
                finishRecipeCreation({ ...recipeBase, macros: finalMacros });
            }
        }
    }
    
    return (
        <>
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) form.reset(); setIsOpen(open);}}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Create a New Meal</DialogTitle>
                    <DialogDescription>
                        Enter your recipe details below. Provide any nutrition info you know, and we'll use AI to fill in the rest.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <ScrollArea className="h-[70vh] pr-6">
                            <div className="space-y-4">
                                <FormField control={form.control} name="title" render={({ field }) => ( <FormItem> <FormLabel>Recipe Title</FormLabel> <FormControl><Input placeholder="e.g., Spicy Chicken Tacos" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                                <FormField control={form.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description (Optional)</FormLabel> <FormControl><Textarea placeholder="A short, enticing description of your creation." {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                                <div className="space-y-2">
                                     <FormLabel>Ingredients</FormLabel>
                                     <div className="space-y-2">
                                        {fields.map((field, index) => (
                                            <div key={field.id} className="flex items-center gap-2 relative">
                                                <Input 
                                                    {...form.register(`ingredients.${index}.value`)} 
                                                    className="flex-1" 
                                                    placeholder="e.g., 1 cup flour"
                                                    onFocus={() => setActiveInputIndex(index)}
                                                    onBlur={() => setTimeout(() => { if (document.activeElement?.ariaRole !== 'option') { setActiveInputIndex(null); }}, 150)}
                                                    autoComplete="off"
                                                />
                                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}> <Trash2 className="h-4 w-4" /> </Button>
                                                {activeInputIndex === index && filteredSuggestions.length > 0 && (
                                                    <Card className="absolute z-10 w-full mt-1 top-full max-h-48 overflow-y-auto">
                                                        {filteredSuggestions.map(item => (
                                                            <div 
                                                                key={item.id} 
                                                                className="p-2 hover:bg-accent cursor-pointer"
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    handleSuggestionClick(item);
                                                                }}
                                                                role="option"
                                                                aria-selected="false"
                                                                tabIndex={0}
                                                            >
                                                                {item.name}
                                                            </div>
                                                        ))}
                                                    </Card>
                                                )}
                                            </div>
                                        ))}
                                     </div>
                                     {form.formState.errors.ingredients?.root && ( <p className="text-sm font-medium text-destructive">{form.formState.errors.ingredients.root.message}</p> )}
                                     <Button type="button" variant="outline" className="w-full" onClick={() => setIsAddIngredientOpen(true)}>
                                        <span className="flex items-center justify-center">
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Add Ingredient
                                        </span>
                                     </Button>
                                </div>
                                <FormField control={form.control} name="instructions" render={({ field }) => ( <FormItem> <FormLabel>Instructions</FormLabel> <FormControl><Textarea placeholder="1. Chop vegetables.\n2. Sauté chicken...\n3. Serve hot." {...field} rows={6} /></FormControl> <FormMessage /> </FormItem> )}/>
                                <Collapsible>
                                    <CollapsibleTrigger asChild>
                                        <div className="flex w-full items-center justify-between rounded-lg border p-4 cursor-pointer">
                                        <div className="space-y-0.5 text-left"> <FormLabel className="text-base"> Nutritional Information (Optional) </FormLabel> <p className="text-sm text-muted-foreground"> Enter any values you know per serving. </p> </div>
                                        <ChevronDown className="h-5 w-5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                        </div>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="space-y-4 pt-4">
                                        <ScrollArea className="h-72 pr-4">
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <FormField control={form.control} name="nutrition.calories" render={({ field }) => ( <FormItem><FormLabel>Calories</FormLabel><FormControl><Input type="number" placeholder="kcal" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                                    <FormField control={form.control} name="nutrition.protein" render={({ field }) => ( <FormItem><FormLabel>Protein</FormLabel><FormControl><Input type="number" placeholder="grams" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <FormField control={form.control} name="nutrition.carbs" render={({ field }) => ( <FormItem><FormLabel>Carbs</FormLabel><FormControl><Input type="number" placeholder="grams" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                                    <FormField control={form.control} name="nutrition.fat" render={({ field }) => ( <FormItem><FormLabel>Total Fat</FormLabel><FormControl><Input type="number" placeholder="grams" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <FormField control={form.control} name="nutrition.fiber" render={({ field }) => ( <FormItem><FormLabel>Fiber</FormLabel><FormControl><Input type="number" placeholder="grams" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                                    <FormField control={form.control} name="nutrition.sugar" render={({ field }) => ( <FormItem><FormLabel>Sugar</FormLabel><FormControl><Input type="number" placeholder="grams" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <FormField control={form.control} name="nutrition.sodium" render={({ field }) => ( <FormItem><FormLabel>Sodium</FormLabel><FormControl><Input type="number" placeholder="mg" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                                    <FormField control={form.control} name="nutrition.cholesterol" render={({ field }) => ( <FormItem><FormLabel>Cholesterol</FormLabel><FormControl><Input type="number" placeholder="mg" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <FormField control={form.control} name="nutrition.saturatedFat" render={({ field }) => ( <FormItem><FormLabel>Saturated Fat</FormLabel><FormControl><Input type="number" placeholder="grams" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                                    <FormField control={form.control} name="nutrition.monounsaturatedFat" render={({ field }) => ( <FormItem><FormLabel>Monounsaturated Fat</FormLabel><FormControl><Input type="number" placeholder="grams" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <FormField control={form.control} name="nutrition.polyunsaturatedFat" render={({ field }) => ( <FormItem><FormLabel>Polyunsaturated Fat</FormLabel><FormControl><Input type="number" placeholder="grams" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                                    <FormField control={form.control} name="nutrition.transFat" render={({ field }) => ( <FormItem><FormLabel>Trans Fat</FormLabel><FormControl><Input type="number" placeholder="grams" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                                </div>
                                            </div>
                                        </ScrollArea>
                                    </CollapsibleContent>
                                </Collapsible>
                                <FormField control={form.control} name="isPrivate" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"> <div className="space-y-0.5"> <FormLabel className="text-base"> Private Recipe </FormLabel> <p className="text-sm text-muted-foreground"> Private recipes will only be visible to you. </p> </div> <FormControl> <Switch checked={field.value} onCheckedChange={field.onChange} /> </FormControl> </FormItem> )}/>
                            </div>
                        </ScrollArea>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isPending}>
                                <span className="flex items-center justify-center">
                                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Finalize Recipe
                                </span>
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
        <AddIngredientDialog isOpen={isAddIngredientOpen} setIsOpen={setIsAddIngredientOpen} inventory={inventory} onAddIngredient={handleAddIngredient}/>
        
        {isConfirmOpen && conflictData && (
            <ConfirmNutritionDialog
                isOpen={isConfirmOpen}
                userMacros={conflictData.user}
                aiMacros={conflictData.ai}
                onCancel={() => setIsConfirmOpen(false)}
                onConfirm={(resolvedMacros) => {
                    finishRecipeCreation({ ...conflictData.recipeData, macros: resolvedMacros });
                    setIsConfirmOpen(false);
                }}
            />
        )}
        </>
    );
}

    
