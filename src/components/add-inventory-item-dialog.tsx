

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { addInventoryItem, getUnitSystem, getStorageLocations } from "@/lib/data";
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
import type { Unit, StorageLocation } from "@/lib/types";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Item name must be at least 2 characters.",
  }),
  quantity: z.coerce.number().positive({
    message: "Package size must be a positive number.",
  }),
  unit: z.enum(["g", "kg", "ml", "l", "pcs", "oz", "lbs", "fl oz", "gallon"]),
  expiryDate: z.date({
    required_error: "An expiry date is required.",
  }),
  locationId: z.string({
    required_error: "A storage location is required.",
  })
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
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      quantity: 1,
      unit: "lbs",
    },
  });

  useEffect(() => {
    async function fetchData() {
      const system = await getUnitSystem();
      setUnitSystem(system);
      setAvailableUnits(system === 'us' ? usUnits : metricUnits);
      form.setValue('unit', system === 'us' ? 'lbs' : 'kg');

      const locations = await getStorageLocations();
      setStorageLocations(locations);
      if (locations.length > 0) {
        form.setValue('locationId', locations.find(l => l.type === 'Pantry')?.id || locations[0].id);
      }
    }
    if (isOpen) {
        fetchData();
        form.reset({
            name: "",
            quantity: 1,
            unit: unitSystem === 'us' ? 'lbs' : 'kg',
            expiryDate: addDays(new Date(), 7),
            locationId: storageLocations.find(l => l.type === 'Pantry')?.id || storageLocations[0]?.id
        });
    }
  }, [isOpen, form, storageLocations, unitSystem]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const newItem = await addInventoryItem({
        name: values.name,
        totalQuantity: values.quantity, // When adding, total and original are the same
        originalQuantity: values.quantity,
        unit: values.unit,
        expiryDate: values.expiryDate,
        locationId: values.locationId,
      });
      onItemAdded(newItem);
      toast({
        title: "Item Added",
        description: `${newItem.name} has been added to your inventory.`,
      });
      setIsOpen(false);
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
            Add a new package to your inventory. You can manage individual quantities later.
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
                name="quantity"
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                name="locationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Storage Location</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {storageLocations.map(location => (
                            <SelectItem key={location.id} value={location.id}>{location.name} ({location.type})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
