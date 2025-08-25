
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
import { Loader2, Trash2, Edit } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { ScrollArea } from "./ui/scroll-area";
import { EditDishDialog } from "./edit-dish-dialog";
import { Separator } from "./ui/separator";
import { EditDishTimeDialog } from "./edit-dish-time-dialog";

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

    useEffect(() => {
        setDishes(meal.dishes);
    }, [meal]);
    
    const handleEditClick = (dish: LoggedDish) => {
        setDishToEdit(dish);
        setIsDishTimeEditorOpen(true);
    };

    async function onSaveChanges() {
        // This function now only saves changes to the list of dishes,
        // for instance, if a dish was removed because it was moved.
        if (dishes.length === meal.dishes.length) {
            setIsOpen(false); // No changes to save
            return;
        }

        setIsPending(true);
        const result = await handleUpdateMealLog(meal.id, dishes);
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
          <DialogTitle>Edit Meal Log: {meal.meal}</DialogTitle>
          <DialogDescription>
            Manage the individual foods within this meal log.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <h4 className="font-medium">Foods in this Meal</h4>
            <p className="text-sm text-muted-foreground">Click the edit button next to a food to move it to a different time or meal.</p>
            <ScrollArea className="max-h-[60vh]">
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
                 <Button type="button" onClick={onSaveChanges} disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </div>
        </DialogFooter>
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
        />
    )}
    </>
  );
}
