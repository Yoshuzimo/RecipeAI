
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { addInventoryItem, getUnitSystem } from "@/lib/data";
import { Button } from "@/components/ui/button";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import type { ShoppingListItem } from "./shopping-list";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { useEffect, useState } from "react";
import type { Unit } from "@/lib/types";

const itemSchema = z.object({
  name: z.string(),
  packageSize: z.coerce.number().positive({
    message: "Package size must be a positive number.",
  }),
  packageCount: z.coerce.number().int().positive({
      message: "Number of packages must be a positive whole number."
  }),
  unit: z.enum(["g", "kg", "ml", "l", "pcs", "oz", "lbs", "fl oz", "gallon"]),
  expiryDate: z.date({
    required_error: "An expiry date is required.",
  }),
});

const formSchema = z.object({
  items: z.array(itemSchema),
});

const metricUnits: { value: Unit, label: string }[] = [
    { value: 'g', label: 'Grams (g)' },
    { value: 'kg', label: 'Kilograms (kg)' },
    { value: 'ml', label: 'Milliliters (ml)' },
    { value: 'l', label: 'Liters (l)' },
    { value: 'pcs', label: 'Pieces (pcs)' },
];

const usUnits: { value: Unit, label: string }[] = [
    { value: 'oz', label: 'Ounces (oz)' },
    { value: 'lbs', label: 'Pounds (lbs)' },
    { value: 'fl oz', label: 'Fluid Ounces (fl oz)' },
    { value: 'gallon', label: 'Gallons' },
    { value: 'pcs', label: 'Pieces (pcs)' },
];


export function BuyItemsDialog({
  isOpen,
  setIsOpen,
  items,
  onComplete,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  items: ShoppingListItem[];
  onComplete: () => void;
}) {
  const { toast } = useToast();
  const [availableUnits, setAvailableUnits] = useState(usUnits);
  
  useEffect(() => {
    async function fetchUnitSystem() {
      const system = await getUnitSystem();
      setAvailableUnits(system === 'us' ? usUnits : metricUnits);
    }
    fetchUnitSystem();
  }, [isOpen]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      items: items.map(item => ({
        name: item.item,
        packageSize: 1,
        packageCount: 1,
        unit: 'pcs',
        expiryDate: addDays(new Date(), 7),
      })),
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "items",
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await Promise.all(values.items.map(item => addInventoryItem(item)));
      
      toast({
        title: "Inventory Updated",
        description: `${values.items.length} item(s) have been added to your inventory.`,
      });
      onComplete();
      setIsOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add items to inventory. Please try again.",
      });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Purchased Items to Inventory</DialogTitle>
          <DialogDescription>
            Confirm the details for the items you just purchased.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <ScrollArea className="h-96 pr-6">
                <div className="space-y-6">
                {fields.map((field, index) => (
                    <div key={field.id} className="space-y-4 rounded-lg border p-4">
                         <h3 className="font-semibold text-lg">{form.getValues(`items.${index}.name`)}</h3>
                         <Separator />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name={`items.${index}.packageSize`}
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Package Size</FormLabel>
                                    <FormControl>
                                    <Input type="number" placeholder="e.g., 1.5" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name={`items.${index}.unit`}
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Unit</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                        <SelectValue placeholder="Select a unit" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                       {availableUnits.map(unit => (
                                            <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name={`items.${index}.packageCount`}
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Number of Packages</FormLabel>
                                <FormControl>
                                <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                        control={form.control}
                        name={`items.${index}.expiryDate`}
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Expiry Date</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                    )}
                                    >
                                    {field.value ? (
                                        format(field.value, "PPP")
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) => date < new Date()}
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </div>
                ))}
                </div>
            </ScrollArea>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Adding to Inventory...</> : "Add to Inventory"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
