
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { addInventoryItem, getUnitSystem, getStorageLocations } from "@/lib/data";
import { Button } from "@/components/ui/button";
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
import { useEffect, useState } from "react";
import type { Unit, StorageLocation, InventoryItem } from "@/lib/types";

const formSchema = z.object({
  quantity: z.coerce.number().positive({
    message: "Package size must be a positive number.",
  }),
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

export function AddPackageForm({
  itemName,
  unit,
  onPackageAdded,
  onCancel,
}: {
  itemName: string;
  unit: Unit;
  onPackageAdded: (item: InventoryItem) => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 1,
    },
  });

  useEffect(() => {
    async function fetchData() {
      const locations = await getStorageLocations();
      setStorageLocations(locations);
      if (locations.length > 0) {
        const defaultLocation = locations.find(l => l.type === 'Pantry') || locations[0];
        form.setValue('locationId', defaultLocation.id);
      }
       form.setValue('expiryDate', addDays(new Date(), 7));
    }
    fetchData();
  }, [form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const newItem = await addInventoryItem({
        name: itemName,
        totalQuantity: values.quantity, // When adding, total and original are the same
        originalQuantity: values.quantity,
        unit: unit,
        expiryDate: values.expiryDate,
        locationId: values.locationId,
      });
      onPackageAdded(newItem);
      toast({
        title: "Package Added",
        description: `A new package of ${itemName} has been added.`,
      });
      onCancel(); // Close the form
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add package. Please try again.",
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4 border rounded-lg bg-muted/50">
         <div className="grid grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Package Size ({unit})</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="locationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {storageLocations.map(location => (
                            <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>
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
                            "w-full pl-3 text-left font-normal bg-background",
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
            <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Adding...</> : "Add Package"}
                </Button>
            </div>
      </form>
    </Form>
  );
}

