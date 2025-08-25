
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
import type { LoggedDish } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";

const formSchema = z.object({
  name: z.string().min(1, "Dish name cannot be empty."),
  calories: z.coerce.number().min(0, "Must be a positive number."),
  protein: z.coerce.number().min(0, "Must be a positive number."),
  carbs: z.coerce.number().min(0, "Must be a positive number."),
  fat: z.coerce.number().min(0, "Must be a positive number."),
  fiber: z.coerce.number().min(0, "Must be a positive number.").optional(),
  fats: z.object({
      saturated: z.coerce.number().min(0, "Must be a positive number.").optional(),
      monounsaturated: z.coerce.number().min(0, "Must be a positive number.").optional(),
      polyunsaturated: z.coerce.number().min(0, "Must be a positive number.").optional(),
      trans: z.coerce.number().min(0, "Must be a positive number.").optional(),
  }).optional(),
});

export function EditDishDialog({
  isOpen,
  setIsOpen,
  dish,
  onSave,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  dish: LoggedDish;
  onSave: (updatedDish: LoggedDish) => void;
}) {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: dish.name,
      calories: dish.calories,
      protein: dish.protein,
      carbs: dish.carbs,
      fat: dish.fat,
      fiber: dish.fiber,
      fats: dish.fats,
    },
  });

  useEffect(() => {
    form.reset({
      name: dish.name,
      calories: dish.calories,
      protein: dish.protein,
      carbs: dish.carbs,
      fat: dish.fat,
      fiber: dish.fiber,
      fats: dish.fats,
    });
  }, [dish, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    onSave({
      name: values.name,
      calories: values.calories,
      protein: values.protein,
      carbs: values.carbs,
      fat: values.fat,
      fiber: values.fiber,
      fats: values.fats,
    });
    setIsOpen(false);
    toast({
        title: "Dish Updated",
        description: `The nutritional information for "${values.name}" has been updated.`
    })
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Dish: {dish.name}</DialogTitle>
          <DialogDescription>
            Adjust the name and nutritional information for this specific item in your meal log.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <ScrollArea className="h-96 pr-4">
                <div className="space-y-4">
                    <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Dish Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
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
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
