
"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { handleLogManualMeal, getClientTodaysMacros, getSettings, getClientInventory } from "@/app/actions";
import { Loader2, PlusCircle, Trash2, UtensilsCrossed, Calendar as CalendarIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import type { DailyMacros, Unit, InventoryItem } from "@/lib/types";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { cn } from "@/lib/utils";
import { Checkbox } from "./ui/checkbox";
import { isWithinUserDay } from "@/lib/utils";
import { Card } from "./ui/card";

type MealType = DailyMacros['meal'];

const getDefaultMealType = (todaysMeals: DailyMacros[]): MealType => {
  const hasLunch = todaysMeals.some(meal => meal.meal === 'Lunch');
  if (hasLunch) {
    return 'Dinner';
  }
  return 'Lunch';
};


const usUnits: { value: Unit, label: string }[] = [
    { value: 'pcs', label: 'pcs' }, { value: 'oz', label: 'oz' }, { value: 'lbs', label: 'lbs' },
    { value: 'fl oz', label: 'fl oz' }, { value: 'cup', label: 'cup' }, { value: 'tbsp', label: 'tbsp' },
    { value: 'tsp', label: 'tsp' }, { value: 'gallon', label: 'gallon' }
];
const metricUnits: { value: Unit, label: string }[] = [
    { value: 'pcs', label: 'pcs' }, { value: 'g', label: 'g' }, { value: 'kg', label: 'kg' },
    { value: 'ml', label: 'ml' }, { value: 'l', label: 'l' }
];

const foodItemSchema = z.object({
    quantity: z.string().min(1, "Qty is required."),
    unit: z.string().min(1, "Unit is required."),
    name: z.string().min(1, "Food name cannot be empty."),
    deduct: z.boolean().default(true),
});

const formSchema = z.object({
    mealType: z.enum(["Breakfast", "Lunch", "Dinner", "Snack"]),
    foods: z.array(foodItemSchema).min(1, "You must add at least one food item."),
    loggedAtDate: z.date(),
    loggedAtTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Please enter a valid time in HH:mm format."),
});

type FormData = z.infer<typeof formSchema>;

export function LogManualMealDialog({ onMealLogged }: { onMealLogged: () => void }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const [availableUnits, setAvailableUnits] = useState(usUnits);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [activeInputIndex, setActiveInputIndex] = useState<number | null>(null);

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            mealType: "Breakfast",
            foods: [{ quantity: "1", unit: "pcs", name: "", deduct: true }],
            loggedAtDate: new Date(),
            loggedAtTime: format(new Date(), "HH:mm"),
        },
    });

    const { fields, append, remove, update } = useFieldArray({
        control: form.control,
        name: "foods",
    });
    
    const watchedFoods = form.watch("foods");

    useEffect(() => {
        async function fetchAndSetDefaults() {
            if (isOpen) {
                 const [settings, allMeals, clientInventory] = await Promise.all([
                    getSettings(),
                    getClientTodaysMacros(),
                    getClientInventory()
                ]);
                const dayStartTime = settings?.dayStartTime || "00:00";
                const mealsToday = allMeals.filter(meal => isWithinUserDay(meal.loggedAt, dayStartTime));
                setInventory([...clientInventory.privateItems, ...clientInventory.sharedItems]);

                form.reset({
                    mealType: getDefaultMealType(mealsToday),
                    foods: [{ quantity: "1", unit: "pcs", name: "", deduct: true }],
                    loggedAtDate: new Date(),
                    loggedAtTime: format(new Date(), "HH:mm"),
                });
            }
        }
        fetchAndSetDefaults();
    }, [isOpen, form]);

    const filteredSuggestions = useMemo(() => {
        if (activeInputIndex === null || !watchedFoods[activeInputIndex]?.name) {
            return [];
        }
        const searchTerm = watchedFoods[activeInputIndex].name.toLowerCase();
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
    }, [activeInputIndex, watchedFoods, inventory]);

    const handleSuggestionClick = (item: InventoryItem) => {
        if (activeInputIndex !== null) {
            update(activeInputIndex, {
                ...watchedFoods[activeInputIndex],
                name: item.name,
                unit: item.unit,
            });
            setActiveInputIndex(null); // Close suggestions
        }
    };
    
    const onSubmit = async (data: FormData) => {
        setIsPending(true);
        const foodArray = data.foods.map(f => ({
            quantity: f.quantity,
            unit: f.unit,
            name: f.name,
            deduct: f.deduct,
        }));
        
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
                    <span className="flex items-center">
                        <UtensilsCrossed className="mr-2 h-4 w-4" />
                        Log Meal
                    </span>
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
                                            <div key={field.id} className="grid grid-cols-[auto_80px_80px_1fr_auto] items-start gap-2">
                                                 <FormField
                                                    control={form.control}
                                                    name={`foods.${index}.deduct`}
                                                    render={({ field }) => (
                                                        <FormItem className="flex items-center h-10">
                                                            <FormControl>
                                                                <Checkbox
                                                                    checked={field.value}
                                                                    onCheckedChange={field.onChange}
                                                                />
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name={`foods.${index}.quantity`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormControl><Input placeholder="Qty" {...field} /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name={`foods.${index}.unit`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                                                <SelectContent>
                                                                    {availableUnits.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <div className="relative">
                                                    <FormField
                                                        control={form.control}
                                                        name={`foods.${index}.name`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormControl>
                                                                    <Input
                                                                        placeholder="e.g., apple, slice of toast"
                                                                        {...field}
                                                                        onFocus={() => setActiveInputIndex(index)}
                                                                        onBlur={() => setTimeout(() => {
                                                                            if (document.activeElement?.ariaRole !== 'option') {
                                                                                setActiveInputIndex(null)
                                                                            }
                                                                        }, 150)}
                                                                        autoComplete="off"
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    {activeInputIndex === index && filteredSuggestions.length > 0 && (
                                                        <Card className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto">
                                                            {filteredSuggestions.map(item => (
                                                                <div 
                                                                    key={item.id} 
                                                                    className="p-2 hover:bg-accent cursor-pointer"
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        handleSuggestionClick(item);
                                                                    }}
                                                                    role="option"
                                                                    aria-selected={false}
                                                                    tabIndex={0}
                                                                >
                                                                    {item.name}
                                                                </div>
                                                            ))}
                                                        </Card>
                                                    )}
                                                </div>

                                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                     </div>
                                     <FormDescription>Uncheck an item to log it without deducting from inventory.</FormDescription>
                                     {form.formState.errors.foods?.root && (
                                         <p className="text-sm font-medium text-destructive">{form.formState.errors.foods.root.message}</p>
                                     )}
                                     <Button type="button" variant="outline" className="w-full" onClick={() => append({ quantity: "1", unit: "pcs", name: "", deduct: true })}>
                                        <span className="flex items-center justify-center">
                                            <PlusCircle className="mr-2 h-4 w-4" /> Add Food Item
                                        </span>
                                    </Button>
                                </div>
                            </div>
                        </ScrollArea>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isPending}>
                                <span className="flex items-center justify-center">
                                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Analyze & Log"}
                                </span>
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
