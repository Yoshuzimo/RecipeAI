
"use client";

import { useState, useEffect } from "react";
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
  DialogTrigger
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { handleLogManualMeal } from "@/app/actions";
import { Loader2, PlusCircle, Trash2, UtensilsCrossed, Calendar as CalendarIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import type { DailyMacros } from "@/lib/types";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { cn } from "@/lib/utils";

type MealType = DailyMacros['meal'];

const getDefaultMealType = (): MealType => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Breakfast";
  if (hour >= 12 && hour < 17) return "Lunch";
  if (hour >= 17 && hour < 21) return "Dinner";
  return "Snack";
};

const formSchema = z.object({
    mealType: z.enum(["Breakfast", "Lunch", "Dinner", "Snack"]),
    foods: z.array(z.object({
        value: z.string().min(1, "Food item cannot be empty.")
    })).min(1, "You must add at least one food item."),
    loggedAtDate: z.date(),
    loggedAtTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Please enter a valid time in HH:mm format."),
});

type FormData = z.infer<typeof formSchema>;

export function LogManualMealDialog({ onMealLogged }: { onMealLogged: () => void }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            mealType: getDefaultMealType(),
            foods: [{ value: "" }],
            loggedAtDate: new Date(),
            loggedAtTime: format(new Date(), "HH:mm"),
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "foods",
    });

    useEffect(() => {
        if (isOpen) {
            form.reset({
                mealType: getDefaultMealType(),
                foods: [{ value: "" }],
                loggedAtDate: new Date(),
                loggedAtTime: format(new Date(), "HH:mm"),
            });
        }
    }, [isOpen, form]);
    
    const onSubmit = async (data: FormData) => {
        setIsPending(true);
        const foodArray = data.foods.map(f => f.value);
        
        const [hours, minutes] = data.loggedAtTime.split(":").map(Number);
        const finalLoggedAt = new Date(data.loggedAtDate);
        finalLoggedAt.setHours(hours, minutes);

        const result = await handleLogManualMeal(foodArray, data.mealType, finalLoggedAt);

        if (result.success) {
            toast({
                title: "Meal Logged!",
                description: "Your meal has been analyzed and added to your daily log."
            });
            onMealLogged();
            setIsOpen(false);
        } else {
            toast({
                variant: "destructive",
                title: "Error Logging Meal",
                description: result.error || "Failed to analyze meal. Please try again."
            });
        }
        setIsPending(false);
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    <UtensilsCrossed className="mr-2 h-4 w-4" />
                    Log Meal
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Log a Meal</DialogTitle>
                    <DialogDescription>
                        Enter what you ate below. We'll use AI to calculate the nutritional info.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <ScrollArea className="h-96 pr-6">
                            <div className="space-y-4">
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
                                
                                <div className="space-y-2">
                                     <FormLabel>Foods Eaten</FormLabel>
                                     <div className="space-y-2">
                                        {fields.map((field, index) => (
                                            <div key={field.id} className="flex items-center gap-2">
                                                <Input
                                                    {...form.register(`foods.${index}.value`)}
                                                    className="flex-1"
                                                    placeholder="e.g., 1 apple, 2 slices of toast with butter"
                                                />
                                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                     </div>
                                     {form.formState.errors.foods?.root && (
                                         <p className="text-sm font-medium text-destructive">{form.formState.errors.foods.root.message}</p>
                                     )}
                                     <Button type="button" variant="outline" className="w-full" onClick={() => append({ value: "" })}>
                                        <PlusCircle className="mr-2 h-4 w-4" /> Add Food Item
                                    </Button>
                                </div>
                            </div>
                        </ScrollArea>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Analyze & Log
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
