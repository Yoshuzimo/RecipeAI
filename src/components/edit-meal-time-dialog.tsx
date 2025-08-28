
"use client";

import { useEffect, useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import type { DailyMacros, LoggedDish } from "@/lib/types";
import { handleUpdateMealLog, handleDeleteMealLog } from "@/app/actions";
import { Loader2, Trash2, Edit, Calendar as CalendarIcon } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { ScrollArea } from "./ui/scroll-area";
import { EditDishDialog } from "./edit-dish-dialog";
import { Separator } from "./ui/separator";
import { EditDishTimeDialog } from "./edit-dish-time-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "./ui/input";

const formSchema = z.object({
  loggedAtDate: z.date(),
  loggedAtTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Please enter a valid time in HH:mm format."),
});

export function EditMealTimeDialog({
  isOpen,
  setIsOpen,
  meal,
  onMealUpdated,
  onMealDeleted,
  onDishMoved,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  meal: DailyMacros;
  onMealUpdated: (updatedMeal: DailyMacros) => void;
  onMealDeleted: (mealId: string) => void;
  onDishMoved: (updatedOriginalMeal?: DailyMacros, newMeal?: DailyMacros) => void;
}) {
    const { toast } = useToast();
    const [isPending, setIsPending] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    
    const [dishes, setDishes] = useState<LoggedDish[]>(meal.dishes);
    const [dishToEdit, setDishToEdit] = useState<LoggedDish | null>(null);
    const [isDishTimeEditorOpen, setIsDishTimeEditorOpen] = useState(false);
    
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            loggedAtDate: new Date(meal.loggedAt),
            loggedAtTime: format(new Date(meal.loggedAt), "HH:mm"),
        },
    });

    useEffect(() => {
        setDishes(meal.dishes);
        form.reset({
            loggedAtDate: new Date(meal.loggedAt),
            loggedAtTime: format(new Date(meal.loggedAt), "HH:mm"),
        })
    }, [meal, form]);
    
    const handleEditClick = (dish: LoggedDish) => {
        setDishToEdit(dish);
        setIsDishTimeEditorOpen(true);
    };

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsPending(true);

        const [hours, minutes] = values.loggedAtTime.split(":").map(Number);
        const finalLoggedAt = new Date(values.loggedAtDate);
        finalLoggedAt.setHours(hours, minutes);

        const result = await handleUpdateMealLog(meal.id, { loggedAt: finalLoggedAt });

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

  const handleDishUpdated = (updatedMeal: DailyMacros) => {
      onMealUpdated(updatedMeal);
      setDishes(updatedMeal.dishes);
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Meal Log: {meal.meal}</DialogTitle>
          <DialogDescription>
            Manage the individual foods within this meal log.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-4 py-4">
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
                <Separator />
                <h4 className="font-medium">Foods in this Meal</h4>
                <p className="text-sm text-muted-foreground">Click the edit button next to a food to move it to a different time or meal.</p>
                <ScrollArea className="max-h-[40vh]">
                    <div className="space-y-2 pr-4">
                        {dishes.map((dish, index) => (
                            <div key={index} className="flex items-center justify-between rounded-lg border p-3">
                                <p className="font-medium">{dish.name}</p>
                                <Button type="button" variant="ghost" size="icon" onClick={() => handleEditClick(dish)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
            <DialogFooter className="justify-between sm:justify-between pt-4">
                <Button type="button" variant="destructive" size="icon" onClick={() => setIsDeleteConfirmOpen(true)} disabled={isPending}>
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete Meal</span>
                </Button>
                <div className="flex gap-2">
                    <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isPending || !form.formState.isDirty}>
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
        <EditDishTimeDialog
            isOpen={isDishTimeEditorOpen}
            setIsOpen={setIsDishTimeEditorOpen}
            dish={dishToEdit}
            originalMeal={meal}
            onDishMoved={(updatedOriginal, newMeal) => {
                onDishMoved(updatedOriginal, newMeal);
                setIsOpen(false); // Close main dialog after move
            }}
            onDishUpdated={handleDishUpdated}
        />
    )}
    </>
  );
}
