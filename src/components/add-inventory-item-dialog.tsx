
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Calendar as CalendarIcon } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import type { Unit } from "@/lib/types";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Item name must be at least 2 characters.",
  }),
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

export function AddInventoryItemDialog({
  isOpen,
  setIsOpen,
  onItemAdded,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onItemAdded: (item: any) => void;
}) {
  const { toast } = useToast();
  const [unitSystem, setUnitSystem] = useState<'us' | 'metric'>('us');
  const [availableUnits, setAvailableUnits] = useState(usUnits);

  useEffect(() => {
    async function fetchUnitSystem() {
      const system = await getUnitSystem();
      setUnitSystem(system);
      setAvailableUnits(system === 'us' ? usUnits : metricUnits);
      form.setValue('unit', system === 'us' ? 'lbs' : 'kg');
    }
    if (isOpen) {
        fetchUnitSystem();
        // Set default expiry date to 7 days from now
        form.setValue('expiryDate', addDays(new Date(), 7));
    }
  }, [isOpen]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      packageSize: 1,
      packageCount: 1,
      unit: "lbs",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const newItem = await addInventoryItem(values);
      onItemAdded(newItem);
      toast({
        title: "Item Added",
        description: `${newItem.name} has been added to your inventory.`,
      });
      setIsOpen(false);
      form.reset({
        name: "",
        packageSize: 1,
        packageCount: 1,
        unit: unitSystem === 'us' ? 'lbs' : 'kg',
        expiryDate: addDays(new Date(), 7),
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add item. Please try again.",
      });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Item</DialogTitle>
          <DialogDescription>
            Add a new ingredient or leftover to your inventory.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Chicken Breast" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="packageSize"
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
                name="unit"
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
                name="packageCount"
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
              name="expiryDate"
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
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Adding..." : "Add Item"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
