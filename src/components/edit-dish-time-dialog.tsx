
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
import type { LoggedDish, DailyMacros } from "@/lib/types";
import { Loader2, Edit } from "lucide-react";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { EditDishDialog } from "./edit-dish-dialog";

const formSchema = z.object({
  mealType: z.enum(["Breakfast", "Lunch", "Dinner", "Snack"]),
  loggedAtDate: z.date(),
  loggedAtTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Please enter a valid time in HH:mm format."),
});

export function EditDishTimeDialog({
  isOpen,
  setIsOpen,
  dish,
  originalMeal,
  onDishMoved,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  dish: LoggedDish;
  originalMeal: DailyMacros;
  onDishMoved: (updatedOriginalMeal?: DailyMacros, newMeal?: DailyMacros) => void;
}) {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const [isNutritionDialogOpen, setIsNutritionDialogOpen] = useState(false);
  const [editedDish, setEditedDish] = useState(dish);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mealType: originalMeal.meal,
      loggedAtDate: new Date(originalMeal.loggedAt),
      loggedAtTime: format(new Date(originalMeal.loggedAt), "HH:mm"),
    },
  });
  
  useEffect(() => {
    form.reset({
      mealType: originalMeal.meal,
      loggedAtDate: new Date(originalMeal.loggedAt),
      loggedAtTime: format(new Date(originalMeal.loggedAt), "HH:mm"),
    });
    setEditedDish(dish);
  }, [dish, originalMeal, form]);


  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsPending(true);
    const [hours, minutes] = values.loggedAtTime.split(":").map(Number);
    const newLoggedAt = new Date(values.loggedAtDate);
    newLoggedAt.setHours(hours, minutes);
    
    // Server action to move the dish
    const { handleMoveDishToNewMeal } = await import("@/app/actions");
    const result = await handleMoveDishToNewMeal(originalMeal, dish, values.mealType, newLoggedAt);

    if (result.success) {
      toast({ title: "Dish Moved", description: `"${dish.name}" has been moved successfully.` });
      onDishMoved(result.updatedOriginalMeal, result.newMeal);
    } else {
      toast({ variant: "destructive", title: "Error", description: result.error });
    }

    setIsPending(false);
    setIsOpen(false);
  };
  
  const handleNutritionSave = (updatedDish: LoggedDish) => {
      setEditedDish(updatedDish);
      // Here you might want to optimistically update the original meal as well
      // or just wait for the final save.
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move Dish: {dish.name}</DialogTitle>
          <DialogDescription>
            Re-assign this food item to a different meal or time.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
             <FormField
              control={form.control}
              name="mealType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meal Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a meal" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Breakfast">Breakfast</SelectItem>
                      <SelectItem value="Lunch">Lunch</SelectItem>
                      <SelectItem value="Dinner">Dinner</SelectItem>
                      <SelectItem value="Snack">Snack</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="loggedAtDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Date</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                >
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date > new Date()}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
                 <FormField
                    control={form.control}
                    name="loggedAtTime"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Time</FormLabel>
                        <FormControl>
                            <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <DialogFooter className="pt-4 justify-between">
                <Button type="button" variant="outline" onClick={() => setIsNutritionDialogOpen(true)}>
                    <Edit className="mr-2 h-4 w-4" /> Edit Nutritional Info
                </Button>
                <div className="flex gap-2">
                    <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
                    </Button>
                </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    {isNutritionDialogOpen && (
        <EditDishDialog
            isOpen={isNutritionDialogOpen}
            setIsOpen={setIsNutritionDialogOpen}
            dish={editedDish}
            onSave={handleNutritionSave}
        />
    )}
    </>
  );
}
