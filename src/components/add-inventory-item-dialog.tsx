
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { addClientInventoryItem, getClientStorageLocations, getClientHousehold } from "@/app/actions";
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
  FormDescription,
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
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import type { Unit, StorageLocation, NewInventoryItem, InventoryItem, Macros, DetailedFats } from "@/lib/types";
import { Checkbox } from "./ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Separator } from "./ui/separator";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Item name must be at least 2 characters.",
  }),
  quantity: z.coerce.number().positive({
    message: "Package size must be a positive number.",
  }),
  unit: z.enum(["g", "kg", "ml", "l", "pcs", "oz", "lbs", "fl oz", "gallon"]),
  expiryDate: z.date().optional(),
  locationId: z.string({
    required_error: "A storage location is required.",
  }),
  isPrivate: z.boolean().default(false),
  doesNotExpire: z.boolean().default(false),
  // Nutrition fields are now fully optional
  calories: z.coerce.number().min(0).optional(),
  protein: z.coerce.number().min(0).optional(),
  carbs: z.coerce.number().min(0).optional(),
  fat: z.coerce.number().min(0).optional(),
  fiber: z.coerce.number().min(0).optional(),
  saturatedFat: z.coerce.number().min(0).optional(),
  monounsaturatedFat: z.coerce.number().min(0).optional(),
  polyunsaturatedFat: z.coerce.number().min(0).optional(),
  transFat: z.coerce.number().min(0).optional(),
}).refine(data => {
    // Expiry date is required only if 'does not expire' is unchecked
    if (data.doesNotExpire) return true;
    return !!data.expiryDate;
}, {
    message: "An expiry date is required unless the item does not expire.",
    path: ["expiryDate"],
});


const metricUnits: { value: Unit, label: string }[] = [
    { value: 'g', label: 'Grams (g)' },
    { value: 'kg', label: 'Kilograms (kg)' },
    { value: 'ml', label: 'Milliliters (ml)' },
    { value: 'l', label: 'Liters (l)' },
    { value: 'pcs', label: 'Pieces (pcs)' },
];

const usUnits: { value: Unit, label: string }[] = [
    { value: 'g', label: 'Grams (g)' },
    { value: 'l', label: 'Liters (l)' },
    { value: 'pcs', label: 'Pieces (pcs)' },
    { value: 'oz', label: 'Ounces (oz)' },
    { value: 'lbs', label: 'Pounds (lbs)' },
    { value: 'fl oz', label: 'Fluid Ounces (fl oz)' },
    { value: 'gallon', label: 'Gallons' },
];

export function AddInventoryItemDialog({
  isOpen,
  setIsOpen,
  onItemAdded,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onItemAdded: (item: InventoryItem, isPrivate: boolean) => void;
}) {
  const { toast } = useToast();
  const [unitSystem, setUnitSystem] = useState<'us' | 'metric'>('us'); 
  const [availableUnits, setAvailableUnits] = useState(usUnits);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [isInHousehold, setIsInHousehold] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      quantity: 1,
      doesNotExpire: false,
      isPrivate: false,
    },
  });

  const doesNotExpire = form.watch("doesNotExpire");

  useEffect(() => {
    const system: 'us' | 'metric' = 'us'; 
    setUnitSystem(system);
    setAvailableUnits(system === 'us' ? usUnits : metricUnits);

    async function fetchData() {
      const locations = await getClientStorageLocations();
      setStorageLocations(locations);
      const household = await getClientHousehold();
      setIsInHousehold(!!household);
      
       if (isOpen) {
        form.reset({
            name: "",
            quantity: 1,
            unit: system === 'us' ? 'lbs' : 'kg',
            expiryDate: addDays(new Date(), 7),
            locationId: locations.find(l => l.type === 'Pantry')?.id || locations[0]?.id,
            doesNotExpire: false,
            isPrivate: !household, // Default to private if not in a household
        });
      }
    }
    if (isOpen) {
        fetchData();
    }
  }, [isOpen, form]);
   
  useEffect(() => {
    if(doesNotExpire) {
        form.clearErrors("expiryDate");
    }
  }, [doesNotExpire, form]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const newItemData: Partial<NewInventoryItem> = {
        name: values.name,
        totalQuantity: values.quantity,
        originalQuantity: values.quantity,
        unit: values.unit,
        expiryDate: values.doesNotExpire ? null : values.expiryDate!,
        locationId: values.locationId,
        isPrivate: values.isPrivate,
      };
      
      const macros: Partial<Macros> = {};
      if (values.calories) macros.calories = values.calories;
      if (values.protein) macros.protein = values.protein;
      if (values.carbs) macros.carbs = values.carbs;
      if (values.fat) macros.fat = values.fat;
      if (values.fiber) macros.fiber = values.fiber;

      const fats: Partial<DetailedFats> = {};
      const { fat, saturatedFat, monounsaturatedFat, polyunsaturatedFat, transFat } = values;

      if (saturatedFat !== undefined) fats.saturated = saturatedFat;
      if (transFat !== undefined) fats.trans = transFat;

      if (monounsaturatedFat !== undefined) {
        fats.monounsaturated = monounsaturatedFat;
      }
      if (polyunsaturatedFat !== undefined) {
        fats.polyunsaturated = polyunsaturatedFat;
      }
      
      if (fat !== undefined && saturatedFat !== undefined && monounsaturatedFat === undefined && polyunsaturatedFat === undefined) {
          const unsaturated = fat - (saturatedFat || 0) - (transFat || 0);
          fats.monounsaturated = Math.max(0, unsaturated); // Store the remainder as monounsaturated
      }

      if (Object.keys(fats).length > 0) {
        macros.fats = fats;
      }

      if (Object.keys(macros).length > 0) {
        newItemData.macros = macros as Macros;
      }

      const newItem = await addClientInventoryItem(newItemData as NewInventoryItem);
      
      onItemAdded(newItem, values.isPrivate);
      toast({
        title: "Item Added",
        description: `${newItem.name} has been added to your ${values.isPrivate ? 'private' : 'household'} inventory.`,
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
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add New Item</DialogTitle>
          <DialogDescription>
            Add a new container to your inventory. You can manage individual quantities later.
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
                    <FormLabel>Container Size</FormLabel>
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
                          disabled={doesNotExpire}
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
                        disabled={(date) => date < new Date() || doesNotExpire}
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
              name="doesNotExpire"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Item does not expire
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
            
            <Collapsible>
              <CollapsibleTrigger asChild>
                <div className="flex w-full items-center justify-between rounded-lg border p-4 cursor-pointer">
                  <div className="space-y-0.5 text-left">
                    <FormLabel className="text-base">
                        Nutritional Information (Optional)
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                        Provide macros per 100g/ml for more accurate recipe calculations.
                    </p>
                  </div>
                  <ChevronDown className="h-5 w-5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                 <Separator />
                 <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="calories" render={({ field }) => ( <FormItem><FormLabel>Calories</FormLabel><FormControl><Input type="number" placeholder="kcal" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="protein" render={({ field }) => ( <FormItem><FormLabel>Protein</FormLabel><FormControl><Input type="number" placeholder="grams" {...field} /></FormControl><FormMessage /></FormItem> )} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="carbs" render={({ field }) => ( <FormItem><FormLabel>Carbs</FormLabel><FormControl><Input type="number" placeholder="grams" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="fat" render={({ field }) => ( <FormItem><FormLabel>Total Fat</FormLabel><FormControl><Input type="number" placeholder="grams" {...field} /></FormControl><FormMessage /></FormItem> )} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="fiber" render={({ field }) => ( <FormItem><FormLabel>Fiber</FormLabel><FormControl><Input type="number" placeholder="grams" {...field} /></FormControl></FormItem> )} />
                    <FormField control={form.control} name="saturatedFat" render={({ field }) => ( <FormItem><FormLabel>Saturated Fat</FormLabel><FormControl><Input type="number" placeholder="grams" {...field} /></FormControl></FormItem> )} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="monounsaturatedFat" render={({ field }) => ( <FormItem><FormLabel>Monounsaturated Fat</FormLabel><FormControl><Input type="number" placeholder="grams" {...field} /></FormControl></FormItem> )} />
                    <FormField control={form.control} name="polyunsaturatedFat" render={({ field }) => ( <FormItem><FormLabel>Polyunsaturated Fat</FormLabel><FormControl><Input type="number" placeholder="grams" {...field} /></FormControl></FormItem> )} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="transFat" render={({ field }) => ( <FormItem><FormLabel>Trans Fat</FormLabel><FormControl><Input type="number" placeholder="grams" {...field} /></FormControl></FormItem> )} />
                 </div>
              </CollapsibleContent>
            </Collapsible>
            
            {isInHousehold && (
              <FormField
                control={form.control}
                name="isPrivate"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-lg border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Keep this item Private
                      </FormLabel>
                       <FormDescription>
                          Private items are only visible to you. Unchecked items are added to the shared household inventory.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            )}

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

    