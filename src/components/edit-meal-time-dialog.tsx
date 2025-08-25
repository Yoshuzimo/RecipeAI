
"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import type { DailyMacros, LoggedDish } from "@/lib/types";
import { handleUpdateMealLog, handleDeleteMealLog } from "@/app/actions";
import { Calendar as CalendarIcon, Loader2, Trash2, Edit } from "lucide-react";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { ScrollArea } from "./ui/scroll-area";
import { EditDishDialog } from "./edit-dish-dialog";
import { Separator } from "./ui/separator";


const formSchema = z.object({
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Please enter a valid time in HH:mm format."),
  date: z.date(),
  mealType: z.enum(["Breakfast", "Lunch", "Dinner", "Snack"]),
});


export function EditMealTimeDialog({
  isOpen,
  setIsOpen,
  meal,
  onMealUpdated,
  onMealDeleted,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  meal: DailyMacros;
  onMealUpdated: (updatedMeal: DailyMacros) => void;
  onMealDeleted: (mealId: string) => void;
}) {
    const { toast } = useToast();
    const [isPending, setIsPending] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    
    const [dishes, setDishes] = useState<LoggedDish[]>(meal.dishes);
    const [dishToEdit, setDishToEdit] = useState<{dish: LoggedDish, index: number} | null>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            time: format(new Date(meal.loggedAt), "HH:mm"),
            date: new Date(meal.loggedAt),
            mealType: meal.meal,
        }
    });

    useEffect(() => {
        form.reset({ 
            time: format(new Date(meal.loggedAt), "HH:mm"),
            date: new Date(meal.loggedAt),
            mealType: meal.meal,
        });
        setDishes(meal.dishes);
    }, [meal, form]);
    
    const handleSaveDish = (updatedDish: LoggedDish) => {
        if (dishToEdit) {
            const newDishes = [...dishes];
            newDishes[dishToEdit.index] = updatedDish;
            setDishes(newDishes);
        }
    }


    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsPending(true);
        const [hours, minutes] = values.time.split(':').map(Number);
        const newDate = new Date(values.date);
        newDate.setHours(hours, minutes, 0, 0);

        const result = await handleUpdateMealLog(meal.id, dishes, values.mealType, newDate);
        setIsPending(false);

        if (result.success && result.updatedMeal) {
            toast({
                title: "Meal Updated",
                description: `The details for "${meal.meal}" have been updated.`,
            });
            onMealUpdated(result.updatedMeal);
            setIsOpen(false);
        } else {
             toast({
                variant: "destructive",
                title: "Error",
                description: result.error || "Failed to update meal.",
            });
        }
    }
    
    async function onDelete() {
        setIsPending(true);
        const result = await handleDeleteMealLog(meal.id);
        setIsPending(false);
        setIsDeleteConfirmOpen(false);

        if (result.success) {
            toast({ title: "Meal Deleted", description: "The meal log entry has been removed." });
            onMealDeleted(result.mealId);
            setIsOpen(false);
        } else {
            toast({
                variant: "destructive",
                title: "Error",
                description: result.error || "Failed to delete meal.",
            });
        }
    }

  return (
    <>
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Meal Log</DialogTitle>
          <DialogDescription>
            Change the time, date, or type of this meal entry. You can also edit individual foods within this meal.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <ScrollArea className="max-h-[60vh] p-1">
                    <div className="space-y-4 pr-6">
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
                                name="date"
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
                                name="time"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Time (24-hour format)</FormLabel>
                                    <FormControl>
                                        <Input type="time" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <Separator />

                        <div>
                            <FormLabel>Foods in this Meal</FormLabel>
                            <div className="space-y-2 mt-2">
                                {dishes.map((dish, index) => (
                                    <div key={index} className="flex items-center justify-between rounded-lg border p-3">
                                        <p className="font-medium">{dish.name}</p>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => setDishToEdit({dish, index})}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </ScrollArea>
                 <DialogFooter className="justify-between sm:justify-between pt-4">
                    <Button type="button" variant="destructive" size="icon" onClick={() => setIsDeleteConfirmOpen(true)} disabled={isPending}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete Meal</span>
                    </Button>
                    <div className="flex gap-2">
                        <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </div>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
    <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete this meal log entry. This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {isPending ? "Deleting..." : "Delete"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
     {dishToEdit && (
        <EditDishDialog 
            isOpen={!!dishToEdit}
            setIsOpen={() => setDishToEdit(null)}
            dish={dishToEdit.dish}
            onSave={handleSaveDish}
        />
     )}
    </>
  );
}
