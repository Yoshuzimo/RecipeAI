
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import type { ShoppingListItem as ShoppingListItemType } from "@/lib/types";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { useEffect, useState } from "react";
import type { Unit, StorageLocation, InventoryItem, NewInventoryItem } from "@/lib/types";
import { Checkbox } from "./ui/checkbox";

const itemSchema = z.object({
  name: z.string(),
  isUntracked: z.boolean().default(false),
  totalQuantity: z.coerce.number().positive({
    message: "Quantity must be a positive number.",
  }),
  unit: z.enum(["g", "kg", "ml", "l", "pcs", "oz", "lbs", "fl oz", "gallon"]),
  expiryDate: z.date().optional(),
  locationId: z.string({
      required_error: "A storage location is required."
  }),
  isPrivate: z.boolean().default(false), 
  doesNotExpire: z.boolean().default(false),
}).refine(data => {
    if (data.isUntracked || data.doesNotExpire) return true;
    return !!data.expiryDate;
}, {
    message: "An expiry date is required unless the item does not expire.",
    path: ["expiryDate"],
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
  items: ShoppingListItemType[];
  onComplete: () => void;
}) {
  const { toast } = useToast();
  // Assume 'us' as default or fetch from a non-server-action source like a settings context
  const [availableUnits, setAvailableUnits] = useState(usUnits);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [isInHousehold, setIsInHousehold] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      items: [],
    },
  });
  
  useEffect(() => {
    // This logic could be moved to a client-side settings context in the future
    const system: 'us' | 'metric' = 'us';
    setAvailableUnits(system === 'us' ? usUnits : metricUnits);
    
    async function fetchData() {
      const locations = await getClientStorageLocations();
      setStorageLocations(locations);
      const household = await getClientHousehold();
      setIsInHousehold(!!household);
    }
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && storageLocations.length > 0) {
        const pantryId = storageLocations.find(l => l.type === 'Pantry')?.id || storageLocations[0].id;
        form.reset({
            items: items.map(item => {
                const doesNotExpire = ['salt', 'sugar', 'honey'].some(nonExp => item.item.toLowerCase().includes(nonExp));
                return {
                    name: item.item,
                    isUntracked: false,
                    totalQuantity: 1,
                    unit: 'pcs' as Unit,
                    expiryDate: doesNotExpire ? undefined : addDays(new Date(), 7),
                    locationId: pantryId,
                    isPrivate: false,
                    doesNotExpire: doesNotExpire,
                };
            })
        });
    }
  }, [isOpen, storageLocations, items, form]);

  const { fields } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  const watchedItems = form.watch("items");

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const itemsToAdd: NewInventoryItem[] = values.items.map(item => ({
        name: item.name,
        isUntracked: item.isUntracked,
        totalQuantity: item.isUntracked ? 1 : item.totalQuantity,
        originalQuantity: item.isUntracked ? 1 : item.totalQuantity,
        unit: item.isUntracked ? 'pcs' : item.unit,
        expiryDate: item.isUntracked || item.doesNotExpire ? null : item.expiryDate!,
        locationId: item.locationId,
        isPrivate: item.isPrivate,
      }));

      const promises = itemsToAdd.map((item) => {
          return addClientInventoryItem(item);
      });

      await Promise.all(promises);
      
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
            {isInHousehold && " Unchecked items will be added to the shared household inventory."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <ScrollArea className="h-96 pr-6">
                <div className="space-y-6">
                {fields.map((field, index) => {
                  const itemState = watchedItems?.[index];
                  const isUntracked = itemState?.isUntracked;
                  const doesNotExpire = itemState?.doesNotExpire;
                  return (
                    <div key={field.id} className="space-y-4 rounded-lg border p-4">
                         <h3 className="font-semibold text-lg">{form.getValues(`items.${index}.name`)}</h3>
                          <FormField
                            control={form.control}
                            name={`items.${index}.isUntracked`}
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
                                        Untracked Item (e.g. spices, oil)
                                    </FormLabel>
                                </div>
                                </FormItem>
                            )}
                            />
                         <Separator />
                        {!isUntracked && (
                            <>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name={`items.${index}.totalQuantity`}
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Quantity</FormLabel>
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
                                name={`items.${index}.locationId`}
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
                            name={`items.${index}.doesNotExpire`}
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
                        {isInHousehold && (
                             <FormField
                              control={form.control}
                              name={`items.${index}.isPrivate`}
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
                                       Private items are only visible to you and will be added to your personal inventory.
                                    </FormDescription>
                                  </div>
                                </FormItem>
                              )}
                            />
                        )}
                    </div>
                )})}
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
