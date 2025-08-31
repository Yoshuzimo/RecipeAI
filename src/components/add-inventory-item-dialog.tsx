
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
  isUntracked: z.boolean().default(false),
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
  nutrition: z.object({
    servingSizeQuantity: z.coerce.number().min(0).optional(),
    servingSizeUnit: z.enum(["g", "kg", "ml", "l", "pcs", "oz", "lbs", "fl oz", "gallon", "cup", "tbsp", "tsp", ""]).optional(),
    calories: z.coerce.number().min(0).optional(),
    protein: z.coerce.number().min(0).optional(),
    carbs: z.coerce.number().min(0).optional(),
    fat: z.coerce.number().min(0).optional(),
    fiber: z.coerce.number().min(0).optional(),
    saturatedFat: z.coerce.number().min(0).optional(),
    monounsaturatedFat: z.coerce.number().min(0).optional(),
    polyunsaturatedFat: z.coerce.number().min(0).optional(),
    transFat: z.coerce.number().min(0).optional(),
  }),
}).refine(data => {
    if (data.isUntracked || data.doesNotExpire) return true;
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
    { value: 'cup', label: 'Cups' },
    { value: 'tbsp', label: 'Tablespoons' },
    { value: 'tsp', label: 'Teaspoons' },
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
      isUntracked: false,
      quantity: 1,
      doesNotExpire: false,
      isPrivate: false,
      nutrition: {},
    },
  });

  const doesNotExpire = form.watch("doesNotExpire");
  const isUntracked = form.watch("isUntracked");


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
            isUntracked: false,
            quantity: 1,
            unit: system === 'us' ? 'lbs' : 'kg',
            expiryDate: addDays(new Date(), 7),
            locationId: locations.find(l => l.type === 'Pantry')?.id || locations[0]?.id,
            doesNotExpire: false,
            isPrivate: !household, // Default to private if not in a household
            nutrition: {},
        });
      }
    }
    if (isOpen) {
        fetchData();
    }
  }, [isOpen, form]);
   
  useEffect(() => {
    if(doesNotExpire || isUntracked) {
        form.clearErrors("expiryDate");
    }
     if (isUntracked) {
      form.setValue("quantity", 1);
      form.setValue("unit", "pcs");
      form.clearErrors("quantity");
      form.clearErrors("unit");
    }
  }, [doesNotExpire, isUntracked, form]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const newItemData: Partial<NewInventoryItem> = {
        name: values.name,
        totalQuantity: values.isUntracked ? 1 : values.quantity,
        originalQuantity: values.isUntracked ? 1 : values.quantity,
        unit: values.isUntracked ? 'pcs' : values.unit,
        expiryDate: values.isUntracked || values.doesNotExpire ? null : values.expiryDate!,
        locationId: values.locationId,
        isPrivate: values.isPrivate,
        isUntracked: values.isUntracked,
      };
      
      const { nutrition } = values;
      
      if (nutrition.servingSizeQuantity && nutrition.servingSizeUnit) {
          const servingMacros: Partial<Macros> = {};
          if (nutrition.calories !== undefined && nutrition.calories !== null) servingMacros.calories = nutrition.calories;
          if (nutrition.protein !== undefined && nutrition.protein !== null) servingMacros.protein = nutrition.protein;
          if (nutrition.carbs !== undefined && nutrition.carbs !== null) servingMacros.carbs = nutrition.carbs;
          if (nutrition.fat !== undefined && nutrition.fat !== null) servingMacros.fat = nutrition.fat;
          if (nutrition.fiber !== undefined && nutrition.fiber !== null) servingMacros.fiber = nutrition.fiber;

          const fats: Partial<DetailedFats> = {};
          const { fat, saturatedFat, monounsaturatedFat, polyunsaturatedFat, transFat } = nutrition;

          if (saturatedFat !== undefined && saturatedFat !== null) fats.saturated = saturatedFat;
          if (transFat !== undefined && transFat !== null) fats.trans = transFat;

          if (monounsaturatedFat !== undefined && monounsaturatedFat !== null) {
              fats.monounsaturated = monounsaturatedFat;
          }
          if (polyunsaturatedFat !== undefined && polyunsaturatedFat !== null) {
              fats.polyunsaturated = polyunsaturatedFat;
          }
          
          if ((fat !== undefined && fat !== null) && (saturatedFat !== undefined && saturatedFat !== null) && (monounsaturatedFat === undefined || monounsaturatedFat === null) && (polyunsaturatedFat === undefined || polyunsaturatedFat === null)) {
              const unsaturated = fat - (saturatedFat || 0) - (transFat || 0);
              fats.monounsaturated = Math.max(0, unsaturated);
          }

          if (Object.keys(fats).length > 0) {
              servingMacros.fats = fats;
          }
          
          if(Object.keys(servingMacros).length > 0) {
              newItemData.servingSize = { quantity: nutrition.servingSizeQuantity, unit: nutrition.servingSizeUnit as Unit };
              newItemData.servingMacros = servingMacros as Macros;
          }
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
                    <Input placeholder="e.g., Chicken Breast, Olive Oil" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isUntracked"
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
                      Item is untracked (e.g., spices, oil)
                    </FormLabel>
                     <FormDescription>
                        For items you just want to know if you 'have' or 'don't have'.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {!isUntracked && (
              <>
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
              </>
            )}

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
            
            <Collapsible>
              <CollapsibleTrigger asChild>
                <div className="flex w-full items-center justify-between rounded-lg border p-4 cursor-pointer">
                  <div className="space-y-0.5 text-left">
                    <FormLabel className="text-base">
                        Nutritional Information (Optional)
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                        Add nutrition info for more accurate recipe calculations.
                    </p>
                  </div>
                  <ChevronDown className="h-5 w-5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                 <Separator />
                 <p className="text-sm text-muted-foreground">Enter values per serving size.</p>
                 <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="nutrition.servingSizeQuantity" render={({ field }) => ( <FormItem><FormLabel>Serving Size</FormLabel><FormControl><Input type="number" placeholder="e.g., 150" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="nutrition.servingSizeUnit" render={({ field }) => ( <FormItem><FormLabel>Unit</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue placeholder="Unit" /></SelectTrigger></FormControl><SelectContent>{availableUnits.map(unit => <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="nutrition.calories" render={({ field }) => ( <FormItem><FormLabel>Calories</FormLabel><FormControl><Input type="number" placeholder="kcal" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="nutrition.protein" render={({ field }) => ( <FormItem><FormLabel>Protein</FormLabel><FormControl><Input type="number" placeholder="grams" {...field} /></FormControl><FormMessage /></FormItem> )} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="nutrition.carbs" render={({ field }) => ( <FormItem><FormLabel>Carbs</FormLabel><FormControl><Input type="number" placeholder="grams" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="nutrition.fat" render={({ field }) => ( <FormItem><FormLabel>Total Fat</FormLabel><FormControl><Input type="number" placeholder="grams" {...field} /></FormControl><FormMessage /></FormItem> )} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="nutrition.fiber" render={({ field }) => ( <FormItem><FormLabel>Fiber</FormLabel><FormControl><Input type="number" placeholder="grams" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="nutrition.saturatedFat" render={({ field }) => ( <FormItem><FormLabel>Saturated Fat</FormLabel><FormControl><Input type="number" placeholder="grams" {...field} /></FormControl><FormMessage /></FormItem> )} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="nutrition.monounsaturatedFat" render={({ field }) => ( <FormItem><FormLabel>Monounsaturated Fat</FormLabel><FormControl><Input type="number" placeholder="grams" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="nutrition.polyunsaturatedFat" render={({ field }) => ( <FormItem><FormLabel>Polyunsaturated Fat</FormLabel><FormControl><Input type="number" placeholder="grams" {...field} /></FormControl><FormMessage /></FormItem> )} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="nutrition.transFat" render={({ field }) => ( <FormItem><FormLabel>Trans Fat</FormLabel><FormControl><Input type="number" placeholder="grams" {...field} /></FormControl><FormMessage /></FormItem> )} />
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
