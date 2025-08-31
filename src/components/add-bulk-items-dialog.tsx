
"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Calendar as CalendarIcon, Loader2, Utensils, PlusCircle } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import type { Unit, StorageLocation, NewInventoryItem, InventoryItem, Macros, DetailedFats } from "@/lib/types";
import { Checkbox } from "./ui/checkbox";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { Textarea } from "./ui/textarea";
import { addClientInventoryItem, getClientStorageLocations, getClientHousehold } from "@/app/actions";
import { EditMacrosDialog } from "./edit-macros-dialog";

const itemSchema = z.object({
  name: z.string().min(1, "Item name cannot be empty."),
  isUntracked: z.boolean().default(false),
  quantity: z.coerce.number(),
  unit: z.enum(["g", "kg", "ml", "l", "pcs", "oz", "lbs", "fl oz", "gallon", "cup", "tbsp", "tsp", ""]),
  locationId: z.string({
      required_error: "A storage location is required."
  }),
  isPrivate: z.boolean().default(false), 
  macros: z.any().optional(), // Store the full macros object here
});

const formSchema = z.object({
  items: z.array(itemSchema),
});

const metricUnits: { value: Unit, label: string }[] = [ { value: 'g', label: 'g' }, { value: 'kg', label: 'kg' }, { value: 'ml', label: 'ml' }, { value: 'l', label: 'l' }, { value: 'pcs', label: 'pcs' } ];
const usUnits: { value: Unit, label: string }[] = [ { value: 'oz', label: 'oz' }, { value: 'lbs', label: 'lbs' }, { value: 'fl oz', label: 'fl oz' }, { value: 'gallon', label: 'gallon' }, { value: 'pcs', label: 'pcs' }, { value: 'cup', label: 'cup' }, { value: 'tbsp', label: 'tbsp' }, { value: 'tsp', label: 'tsp' } ];

export function AddBulkItemsDialog({
  isOpen,
  setIsOpen,
  onItemsAdded,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onItemsAdded: (items: InventoryItem[]) => void;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState<'input' | 'confirm'>('input');
  const [inputText, setInputText] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [isInHousehold, setIsInHousehold] = useState(false);
  const [itemToEditNutrition, setItemToEditNutrition] = useState<number | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { items: [] },
  });

  const { fields, append, update, replace } = useFieldArray({ control: form.control, name: "items" });
  const watchedItems = form.watch("items");
  
  useEffect(() => {
    async function fetchData() {
        if(isOpen) {
            const locations = await getClientStorageLocations();
            setStorageLocations(locations);
            const household = await getClientHousehold();
            setIsInHousehold(!!household);
        }
    }
    fetchData();
  }, [isOpen]);

  const handleNext = () => {
    const pantryId = storageLocations.find(l => l.type === 'Pantry')?.id || storageLocations[0]?.id || '';
    const itemNames = inputText.split('\n').map(name => name.trim()).filter(name => name);
    const formItems = itemNames.map(name => ({
        name,
        isUntracked: false,
        quantity: 1,
        unit: 'pcs' as Unit,
        locationId: pantryId,
        isPrivate: !isInHousehold,
        macros: undefined,
    }));
    replace(formItems);
    setStep('confirm');
  }

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
        setStep('input');
        setInputText("");
        replace([]);
    }, 200);
  }

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsPending(true);
    try {
        const newItems: NewInventoryItem[] = data.items.map(item => ({
            name: item.name,
            totalQuantity: item.isUntracked ? 1 : item.quantity,
            originalQuantity: item.isUntracked ? 1 : item.quantity,
            unit: item.isUntracked ? 'pcs' : item.unit as Unit,
            expiryDate: null,
            locationId: item.locationId,
            isPrivate: item.isPrivate,
            isUntracked: item.isUntracked,
            macros: item.macros,
        }));
        
        const addedItems: InventoryItem[] = [];
        for (const item of newItems) {
            const added = await addClientInventoryItem(item);
            addedItems.push(added);
        }

        onItemsAdded(addedItems);
        toast({
            title: "Items Added",
            description: `${addedItems.length} items have been successfully added to your inventory.`
        });
        handleClose();

    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to add items. Please try again." });
    } finally {
        setIsPending(false);
    }
  }
  
  const handleNutritionSave = (index: number, newMacros: Macros) => {
    const currentItem = form.getValues(`items.${index}`);
    update(index, { ...currentItem, macros: newMacros });
    setItemToEditNutrition(null);
  }

  const renderInputStep = () => (
    <DialogContent className="h-screen w-screen max-w-full flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
            <DialogTitle>Add Bulk Items</DialogTitle>
            <DialogDescription>Enter each grocery item on a new line.</DialogDescription>
        </DialogHeader>
        <div className="flex-grow px-6 overflow-y-auto">
            <Textarea 
                placeholder="Chicken Breast&#10;Olive Oil&#10;Brown Rice..."
                className="w-full h-full resize-none text-lg"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
            />
        </div>
        <DialogFooter className="p-6 border-t bg-background">
            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button onClick={handleNext} disabled={!inputText.trim()}>Next</Button>
        </DialogFooter>
    </DialogContent>
  );
  
  const renderConfirmStep = () => (
    <DialogContent className="max-w-4xl">
        <DialogHeader>
            <DialogTitle>Confirm Bulk Items</DialogTitle>
            <DialogDescription>Review the details for each item before adding to your inventory.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <ScrollArea className="h-[60vh]">
                    <div className="space-y-4 pr-4">
                       <div className="grid grid-cols-[1fr_150px_100px_100px_auto_auto_auto] items-center gap-x-2 px-2 text-sm font-medium text-muted-foreground">
                            <span>Item Name</span>
                            <span>Location</span>
                            <span>Quantity</span>
                            <span>Unit</span>
                            <span className="text-center">Private</span>
                            <span className="text-center">Untracked</span>
                            <span className="text-center">Nutrition</span>
                       </div>
                        {fields.map((field, index) => (
                            <div key={field.id} className="grid grid-cols-[1fr_150px_100px_100px_auto_auto_auto] items-center gap-x-2 p-2 border rounded-md">
                                <span className="font-semibold truncate pr-2">{field.name}</span>
                                <FormField control={form.control} name={`items.${index}.locationId`} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{storageLocations.map(loc => <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>)}</SelectContent></Select>)}/>
                                <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => (<Input type="number" {...field} disabled={watchedItems[index]?.isUntracked}/>)}/>
                                <FormField control={form.control} name={`items.${index}.unit`} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value} disabled={watchedItems[index]?.isUntracked}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{[...usUnits, ...metricUnits].map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent></Select>)}/>
                                <div className="flex justify-center"><FormField control={form.control} name={`items.${index}.isPrivate`} render={({ field }) => (<FormItem><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={!isInHousehold}/></FormControl></FormItem>)}/></div>
                                <div className="flex justify-center"><FormField control={form.control} name={`items.${index}.isUntracked`} render={({ field }) => (<FormItem><FormControl><Checkbox checked={field.value} onCheckedChange={e => {
                                    const isChecked = !!e;
                                    const currentItem = form.getValues(`items.${index}`);
                                    update(index, { ...currentItem, isUntracked: isChecked });
                                }}/></FormControl></FormItem>)}/></div>
                                <div className="flex justify-center"><Button type="button" variant="ghost" size="icon" onClick={() => setItemToEditNutrition(index)}><PlusCircle className="h-4 w-4"/></Button></div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setStep('input')}>Back</Button>
                    <Button type="submit" disabled={isPending}>{isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Adding...</> : "Add All to Inventory"}</Button>
                </DialogFooter>
            </form>
        </Form>
    </DialogContent>
  )

  const recipeToEdit = itemToEditNutrition !== null ? { title: form.getValues(`items.${itemToEditNutrition}.name`), macros: form.getValues(`items.${itemToEditNutrition}.macros`) || {calories: 0, protein: 0, carbs: 0, fat: 0}} : null;

  return (
    <>
        <Dialog open={isOpen} onOpenChange={handleClose}>
            {step === 'input' ? renderInputStep() : renderConfirmStep()}
        </Dialog>
        {itemToEditNutrition !== null && recipeToEdit && (
            <EditMacrosDialog 
                isOpen={itemToEditNutrition !== null}
                setIsOpen={() => setItemToEditNutrition(null)}
                recipe={recipeToEdit as any}
                onSave={(newMacros) => handleNutritionSave(itemToEditNutrition, newMacros)}
            />
        )}
    </>
  );
}
