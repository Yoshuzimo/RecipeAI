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
import type { Recipe, Macros } from "@/lib/types";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  calories: z.coerce.number().min(0, "Calories must be a positive number."),
  protein: z.coerce.number().min(0, "Protein must be a positive number."),
  carbs: z.coerce.number().min(0, "Carbs must be a positive number."),
  fat: z.coerce.number().min(0, "Fat must be a positive number."),
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
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        calories: recipe.macros.calories,
        protein: recipe.macros.protein,
        carbs: recipe.macros.carbs,
        fat: recipe.macros.fat,
      });
    }
  }, [isOpen, recipe, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setIsPending(true);
    onSave(values);
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="calories"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Calories</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="protein"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Protein (g)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="carbs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Carbs (g)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fat (g)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
