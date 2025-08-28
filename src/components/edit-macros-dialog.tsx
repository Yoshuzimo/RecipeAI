
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Recipe, Macros, DetailedFats } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";

const formSchema = z.object({
  calories: z.coerce.number().min(0, "Must be a positive number."),
  protein: z.coerce.number().min(0, "Must be a positive number."),
  carbs: z.coerce.number().min(0, "Must be a positive number."),
  fat: z.coerce.number().min(0, "Must be a positive number."),
  fiber: z.coerce.number().min(0).optional(),
  fats: z.object({
      saturated: z.coerce.number().min(0).optional(),
      monounsaturated: z.coerce.number().min(0).optional(),
      polyunsaturated: z.coerce.number().min(0).optional(),
      trans: z.coerce.number().min(0).optional(),
  }).optional(),
});

export function EditMacrosDialog({
  isOpen,
  setIsOpen,
  recipe,
  onSave,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  recipe: Recipe;
  onSave: (newMacros: Macros) => void;
}) {
  const [isPending, setIsPending] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      calories: recipe.macros.calories,
      protein: recipe.macros.protein,
      carbs: recipe.macros.carbs,
      fat: recipe.macros.fat,
      fiber: recipe.macros.fiber,
      fats: recipe.macros.fats,
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        calories: recipe.macros.calories,
        protein: recipe.macros.protein,
        carbs: recipe.macros.carbs,
        fat: recipe.macros.fat,
        fiber: recipe.macros.fiber,
        fats: recipe.macros.fats,
      });
    }
  }, [isOpen, recipe, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setIsPending(true);
    const newMacros: Macros = {
        calories: values.calories,
        protein: values.protein,
        carbs: values.carbs,
        fat: values.fat,
        fiber: values.fiber,
        fats: values.fats,
    };
    onSave(newMacros);
    setIsPending(false);
    setIsOpen(false);
    toast({
      title: "Macros Updated",
      description: "Nutritional information has been updated for this recipe session.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Macros for {recipe.title}</DialogTitle>
          <DialogDescription>
            Adjust the nutritional information per serving for this recipe.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <ScrollArea className="h-96 pr-4">
              <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="calories" render={({ field }) => ( <FormItem><FormLabel>Calories</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="protein" render={({ field }) => ( <FormItem><FormLabel>Protein (g)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="carbs" render={({ field }) => ( <FormItem><FormLabel>Carbs (g)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="fat" render={({ field }) => ( <FormItem><FormLabel>Total Fat (g)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="fiber" render={({ field }) => ( <FormItem><FormLabel>Fiber (g)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="fats.saturated" render={({ field }) => ( <FormItem><FormLabel>Saturated Fat (g)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="fats.monounsaturated" render={({ field }) => ( <FormItem><FormLabel>Monounsaturated Fat (g)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="fats.polyunsaturated" render={({ field }) => ( <FormItem><FormLabel>Polyunsaturated Fat (g)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                  </div>
                  <FormField control={form.control} name="fats.trans" render={({ field }) => ( <FormItem><FormLabel>Trans Fat (g)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
