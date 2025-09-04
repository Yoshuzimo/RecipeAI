
"use client";

import { useState, useEffect } from "react";
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { InventoryItemGroup, DailyMacros } from "@/lib/types";
import { handleEatSingleItem, getClientTodaysMacros, getSettings } from "@/app/actions";
import { Loader2, UtensilsCrossed, Calendar as CalendarIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { cn } from "@/lib/utils";
import { format, differenceInHours } from "date-fns";
import { isWithinUserDay } from "@/lib/utils";

type MealType = DailyMacros["meal"];

const getDefaultMealType = (todaysMeals: DailyMacros[]): MealType => {
  const hasLunch = todaysMeals.some(meal => meal.meal === 'Lunch');
  if (hasLunch) {
    return 'Dinner';
  }
  return 'Lunch';
};

const formSchema = z.object({
  quantityEaten: z.coerce.number().positive("Quantity must be a positive number."),
  mealType: z.enum(["Breakfast", "Lunch", "Dinner", "Snack"]),
  loggedAtDate: z.date(),
  loggedAtTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Please enter a valid time in HH:mm format."),
});

export function EatItemDialog({
  isOpen,
  setIsOpen,
  group,
  onConsumptionLogged,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  group: InventoryItemGroup;
  onConsumptionLogged: () => void;
}) {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  
  const totalAvailable = group.items.reduce((sum, item) => sum + item.totalQuantity, 0);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantityEaten: group.unit === 'pcs' ? 1 : undefined,
      mealType: "Breakfast",
      loggedAtDate: new Date(),
      loggedAtTime: format(new Date(), "HH:mm"),
    },
  });

  useEffect(() => {
    async function fetchAndSetDefaults() {
      if (isOpen) {
        const [settings, allMeals] = await Promise.all([
          getSettings(),
          getClientTodaysMacros()
        ]);
        const dayStartTime = settings?.dayStartTime || "00:00";
        const mealsToday = allMeals.filter(meal => isWithinUserDay(meal.loggedAt, dayStartTime));
        
        form.reset({
          quantityEaten: group.unit === 'pcs' ? 1 : undefined,
          mealType: getDefaultMealType(mealsToday),
          loggedAtDate: new Date(),
          loggedAtTime: format(new Date(), "HH:mm"),
        });
      }
    }
    fetchAndSetDefaults();
  }, [isOpen, group, form]);
  
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (values.quantityEaten > totalAvailable) {
        form.setError("quantityEaten", { message: "Cannot eat more than is available."});
        return;
    }

    setIsPending(true);

    const [hours, minutes] = values.loggedAtTime.split(":").map(Number);
    const finalLoggedAt = new Date(values.loggedAtDate);
    finalLoggedAt.setHours(hours, minutes);

    // For simplicity, we just use the first item in the group as the representative item for logging.
    // A more complex system might need to select a specific package.
    const representativeItem = group.items[0];

    const result = await handleEatSingleItem(
        representativeItem,
        values.quantityEaten,
        values.mealType,
        finalLoggedAt
    );
    
    setIsPending(false);

    if (result.success) {
      toast({
        title: "Item Logged!",
        description: `Your consumption of ${group.name} has been logged and inventory updated.`,
      });
      onConsumptionLogged();
      setIsOpen(false);
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.error || "Failed to log item. Please try again.",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eat {group.name}</DialogTitle>
          <DialogDescription>
            Log how much you ate. We'll deduct it from your inventory and calculate the nutrition for you.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="quantityEaten"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Quantity Eaten ({group.unit})
                  </FormLabel>
                  <FormControl>
                    <Input type="number" min="0" step="any" {...field} />
                  </FormControl>
                  <FormDescription>
                    Total available: {totalAvailable.toFixed(2)} {group.unit}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
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
            <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isPending}>
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UtensilsCrossed className="mr-2 h-4 w-4" />}
                    Log Consumption
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
