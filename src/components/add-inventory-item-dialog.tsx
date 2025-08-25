
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
import { Calendar as CalendarIcon } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import type { Unit, StorageLocation, NewInventoryItem, InventoryItem } from "@/lib/types";
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
  hasMacros: z.boolean().default(false),
  calories: z.coerce.number().optional(),
  protein: z.coerce.number().optional(),
  carbs: z.coerce.number().optional(),
  fat: z.coerce.number().optional(),
  fiber: z.coerce.number().optional(),
  saturatedFat: z.coerce.number().optional(),
  monounsaturatedFat: z.coerce.number().optional(),
  polyunsaturatedFat: z.coerce.number().optional(),
  transFat: z.coerce.number().optional(),
}).refine(data => {
    if (data.doesNotExpire) return true;
    return !!data.expiryDate;
}, {
    message: "An expiry date is required unless the item does not expire.",
    path: ["expiryDate"],
}).refine(data => {
    if (!data.hasMacros) return true;
    return data.calories !== undefined && data.protein !== undefined && data.carbs !== undefined && data.fat !== undefined;
}, {
    message: "Calories, Protein, Carbs, and Fat fields must be filled if nutrition is enabled.",
    path: ["macros"],
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
      hasMacros: false,
    },
  });

  const doesNotExpire = form.watch("doesNotExpire");
  const hasMacros = form.watch("hasMacros");

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
            hasMacros: false,
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
      const newItemData: NewInventoryItem = {
        name: values.name,
        totalQuantity: values.quantity,
        originalQuantity: values.quantity,
        unit: values.unit,
        expiryDate: values.doesNotExpire ? null : values.expiryDate!,
        locationId: values.locationId,
        isPrivate: values.isPrivate,
      };
      
      if (values.hasMacros) {
          newItemData.macros = {
              calories: values.calories!,
              protein: values.protein!,
              carbs: values.carbs!,
              fat: values.fat!,
              fiber: values.fiber,
              fats: {
                saturated: values.saturatedFat,
                monounsaturated: values.monounsaturatedFat,
                polyunsaturated: values.polyunsaturatedFat,
                trans: values.transFat
              }
          }
      }

      const newItem = await addClientInventoryItem(newItemData);
      
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
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                        Nutritional Information (Optional)
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                        Provide macros per 100g/ml for more accurate recipe calculations.
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="hasMacros"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                 <Separator />
                 <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="calories" render={({ field }) => ( <FormItem><FormLabel>Calories</FormLabel><FormControl><Input type="number" placeholder="kcal" {...field} /></FormControl></FormItem> )} />
                    <FormField control={form.control} name="protein" render={({ field }) => ( <FormItem><FormLabel>Protein</FormLabel><FormControl><Input type="number" placeholder="grams" {...field} /></FormControl></FormItem> )} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="carbs" render={({ field }) => ( <FormItem><FormLabel>Carbs</FormLabel><FormControl><Input type="number" placeholder="grams" {...field} /></FormControl></FormItem> )} />
                    <FormField control={form.control} name="fat" render={({ field }) => ( <FormItem><FormLabel>Total Fat</FormLabel><FormControl><Input type="number" placeholder="grams" {...field} /></FormControl></FormItem> )} />
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
