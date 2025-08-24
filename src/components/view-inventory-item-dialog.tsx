
"use client";

import { useState, useMemo, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { InventoryItem, InventoryItemGroup, InventoryPackageGroup, Macros, Unit } from "@/lib/types";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import { Loader2, Trash2, Move, Biohazard, Share2, User, Save, PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { handleUpdateInventoryGroup, handleRemoveInventoryPackageGroup, handleToggleItemPrivacy, getClientHousehold, getClientInventory } from "@/app/actions";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { MoveItemDialog } from "./move-item-dialog";
import { ReportSpoilageDialog } from "./report-spoilage-dialog";
import { Switch } from "./ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Checkbox } from "./ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Separator } from "./ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";

const nutritionSchema = z.object({
    hasMacros: z.boolean().default(false),
    servingSizeQuantity: z.coerce.number().optional(),
    servingSizeUnit: z.enum(["g", "kg", "ml", "l", "pcs", "oz", "lbs", "fl oz", "gallon"]).optional(),
    calories: z.coerce.number().optional(),
    protein: z.coerce.number().optional(),
    carbs: z.coerce.number().optional(),
    fat: z.coerce.number().optional(),
}).refine(data => {
    if (!data.hasMacros) return true;
    return data.servingSizeQuantity && data.servingSizeUnit && data.calories !== undefined && data.protein !== undefined && data.carbs !== undefined && data.fat !== undefined;
}, {
    message: "All nutrition fields must be filled if nutrition is enabled.",
    path: ["macros"],
});


const packageSchema = z.record(z.string(), z.object({
    full: z.coerce.number().int().min(0),
    partial: z.coerce.number().min(0),
}));

const formSchema = packageSchema.and(nutritionSchema);


type FormData = z.infer<typeof formSchema>;

const nonDivisibleKeywords = ['egg', 'eggs'];

const metricUnits: { value: Unit, label: string }[] = [
    { value: 'g', label: 'g' }, { value: 'kg', label: 'kg' },
    { value: 'ml', label: 'ml' }, { value: 'l', label: 'l' }, { value: 'pcs', label: 'pcs' },
];

const usUnits: { value: Unit, label: string }[] = [
    { value: 'oz', label: 'oz' }, { value: 'lbs', label: 'lbs' },
    { value: 'fl oz', label: 'fl oz' }, { value: 'gallon', label: 'gallon' }, { value: 'pcs', label: 'pcs' },
];

export function ViewInventoryItemDialog({
  isOpen,
  setIsOpen,
  group,
  isPrivate: initialIsPrivate,
  onUpdateComplete,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  group: InventoryItemGroup;
  isPrivate: boolean;
  onUpdateComplete: (privateItems: InventoryItem[], sharedItems: InventoryItem[]) => void;
}) {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<number | null>(null);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [isSpoilageDialogOpen, setIsSpoilageDialogOpen] = useState(false);
  const [isInHousehold, setIsInHousehold] = useState(false);
  const [isPrivate, setIsPrivate] = useState(initialIsPrivate);
  const [unitSystem, setUnitSystem] = useState<'us' | 'metric'>('us');
  const [availableUnits, setAvailableUnits] = useState(usUnits);


  const packageGroups = useMemo(() => {
    return group.items.reduce((acc, item) => {
        const size = item.originalQuantity;
        if (!acc[size]) {
            acc[size] = {
                size: size,
                fullPackages: [],
                partialPackage: null,
                items: [],
            };
        }
        acc[size].items.push(item);
        if (item.totalQuantity === item.originalQuantity) {
            acc[size].fullPackages.push(item);
        } else {
            acc[size].partialPackage = item;
        }
        return acc;
    }, {} as Record<number, InventoryPackageGroup & { items: InventoryItem[] }>);
  }, [group.items]);

  const defaultValues = useMemo(() => {
    let values: Partial<FormData> = {};
    for (const pkgGroup of Object.values(packageGroups)) {
      values[pkgGroup.size] = {
        full: pkgGroup.fullPackages.length,
        partial: pkgGroup.partialPackage?.totalQuantity ?? 0,
      };
    }
    const firstItem = group.items[0];
    if (firstItem?.servingMacros) {
        values.hasMacros = true;
        values.servingSizeQuantity = firstItem.servingSize?.quantity;
        values.servingSizeUnit = firstItem.servingSize?.unit;
        values.calories = firstItem.servingMacros.calories;
        values.protein = firstItem.servingMacros.protein;
        values.carbs = firstItem.servingMacros.carbs;
        values.fat = firstItem.servingMacros.fat;
    } else {
        values.hasMacros = false;
    }
    return values as FormData;
  }, [packageGroups, group.items]);
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const { control, handleSubmit, watch, formState: { isDirty }, reset } = form;
  
  useEffect(() => {
    const system: 'us' | 'metric' = 'us';
    setUnitSystem(system);
    setAvailableUnits(system === 'us' ? usUnits : metricUnits);

    reset(defaultValues);
    setIsPrivate(initialIsPrivate);
    
    async function checkHousehold() {
      const household = await getClientHousehold();
      setIsInHousehold(!!household);
    }
    checkHousehold();
  }, [group, defaultValues, reset, initialIsPrivate]);


  const watchedValues = watch();

  const handleTogglePrivacy = async (newPrivacyState: boolean) => {
    if (!isInHousehold) return;
    
    setIsPending(true);
    const result = await handleToggleItemPrivacy(group.items, newPrivacyState);
    setIsPending(false);

    if (result.success) {
      toast({ title: "Privacy Updated", description: `${group.name} has been moved.` });
      const { privateItems, sharedItems } = await getClientInventory();
      onUpdateComplete(privateItems, sharedItems);
      setIsPrivate(newPrivacyState);
      setIsOpen(false); // Close the dialog after successful toggle
    } else {
      toast({ variant: "destructive", title: "Update Failed", description: result.error });
      // Revert the switch on failure
      setIsPrivate(!newPrivacyState);
    }
  };


  const onSubmit = async (data: FormData) => {
    setIsPending(true);

    const { hasMacros, servingSizeQuantity, servingSizeUnit, calories, protein, carbs, fat, ...packageData } = data;
    
    let nutritionPayload: any = undefined;
    if (hasMacros) {
        nutritionPayload = {
            servingSize: { quantity: servingSizeQuantity!, unit: servingSizeUnit! },
            servingMacros: { calories: calories!, protein: protein!, carbs: carbs!, fat: fat! },
        };
    }

    const result = await handleUpdateInventoryGroup(
        group.items, 
        packageData, 
        group.name, 
        group.unit,
        nutritionPayload,
    );
    setIsPending(false);

    if (result.success && result.newInventory) {
        toast({ title: "Inventory Updated", description: `${group.name} has been updated successfully.` });
        const { privateItems, sharedItems } = await getClientInventory();
        onUpdateComplete(privateItems, sharedItems);
        setIsOpen(false);
    } else {
        toast({ variant: "destructive", title: "Update Failed", description: result.error });
    }
  };
  
  const handleDeleteClick = (size: number) => {
    setGroupToDelete(size);
    setIsConfirmDeleteOpen(true);
  }

  const handleConfirmDelete = async () => {
    if (groupToDelete === null) return;
    
    setIsPending(true);
    const itemsToRemove = packageGroups[groupToDelete].items;
    const result = await handleRemoveInventoryPackageGroup(itemsToRemove);
    setIsPending(false);
    setIsConfirmDeleteOpen(false);

    if (result.success) {
      toast({ title: "Package Size Removed", description: `All ${groupToDelete}${group.unit} containers of ${group.name} have been removed.` });
      const { privateItems, sharedItems } = await getClientInventory();
      onUpdateComplete(privateItems, sharedItems);
      setIsOpen(false);
    } else {
      toast({ variant: "destructive", title: "Removal Failed", description: result.error });
    }
    setGroupToDelete(null);
  };

  const getSliderLabel = (size: number) => {
      const partialValue = watchedValues[size]?.partial ?? 0;
      if (group.unit === 'pcs') {
        return `${Math.round(partialValue)} / ${size} pcs`;
      }
      const percentage = (partialValue / size * 100).toFixed(0);
      return `~${percentage}% full`;
  }
  
  const isNonDivisiblePiece = (itemName: string, unit: string) => {
    if (unit !== 'pcs') {
      return false;
    }
    return nonDivisibleKeywords.some(keyword => itemName.toLowerCase().includes(keyword));
  };
  
  return (
    <>
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage {group.name}</DialogTitle>
          <DialogDescription>
            Adjust quantities or move items between storage locations.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)}>
            <ScrollArea className="h-[60vh] pr-6 my-4">
                <div className="space-y-8">
                {isInHousehold && (
                   <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label className="text-base">
                                Keep Item Private
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Private items are only visible to you. Uncheck to move to shared household inventory.
                            </p>
                        </div>
                        <Switch
                            checked={isPrivate}
                            onCheckedChange={handleTogglePrivacy}
                            disabled={isPending}
                        />
                    </div>
                )}
                {Object.keys(packageGroups).length > 0 ? (
                    Object.values(packageGroups).map(({ size }) => (
                        <div key={size} className="space-y-4 p-4 border rounded-lg">
                            <div className="flex justify-between items-center">
                                <h4 className="font-semibold text-lg">{size}{group.unit} Containers</h4>
                                <Button type="button" variant="ghost" size="icon" onClick={() => handleDeleteClick(size)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                    <span className="sr-only">Delete package size</span>
                                </Button>
                            </div>
                             <Controller
                                name={`${size}.full`}
                                control={control}
                                render={({ field }) => (
                                    <div className="space-y-2">
                                        <Label htmlFor={`full-count-${size}`}>Full Containers</Label>
                                        <Input id={`full-count-${size}`} type="number" min="0" step="1" {...field} />
                                    </div>
                                )}
                            />
                            <Controller
                                name={`${size}.partial`}
                                control={control}
                                render={({ field: { onChange, value } }) => {
                                    const isNonDivisible = isNonDivisiblePiece(group.name, group.unit);
                                    const displayValue = isNonDivisible ? Math.round(value) : Math.round((value / size) * 100);

                                    return (
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <Label>Partial Container</Label>
                                            <span className="text-sm text-muted-foreground">{getSliderLabel(size)}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <Slider
                                                value={[value]}
                                                onValueChange={(vals) => onChange(vals[0])}
                                                max={size}
                                                step={isNonDivisible ? 1 : size / 100}
                                                className="flex-1"
                                            />
                                             <div className="relative w-28">
                                                <Input
                                                    type="number"
                                                    value={displayValue}
                                                    onChange={(e) => {
                                                        const numValue = parseInt(e.target.value, 10);
                                                        if (!isNaN(numValue)) {
                                                            const newActualValue = isNonDivisible
                                                                ? numValue
                                                                : (numValue / 100) * size;
                                                            onChange(Math.max(0, Math.min(size, newActualValue)));
                                                        }
                                                    }}
                                                    className={!isNonDivisible ? "pr-6" : ""}
                                                />
                                                {!isNonDivisible && (
                                                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
                                                    %
                                                    </span>
                                                )}
                                             </div>
                                        </div>
                                    </div>
                                    )
                                }}
                            />
                        </div>
                    ))
                ) : (
                    <div className="text-center text-muted-foreground py-10">
                        No containers for this item. Add one to get started.
                    </div>
                )}
                 <Collapsible>
                    <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between rounded-lg border p-4 cursor-pointer">
                        <div className="space-y-0.5">
                            <FormLabel className="text-base">
                                Nutritional Information
                            </FormLabel>
                            <p className="text-sm text-muted-foreground">
                                Add nutrition info to get more accurate recipe calculations.
                            </p>
                        </div>
                        <FormField
                            control={control}
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
                            <FormField control={control} name="servingSizeQuantity" render={({ field }) => ( <FormItem><FormLabel>Serving Size</FormLabel><FormControl><Input type="number" placeholder="e.g., 150" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={control} name="servingSizeUnit" render={({ field }) => ( <FormItem><FormLabel>Unit</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Unit" /></SelectTrigger></FormControl><SelectContent>{availableUnits.map(unit => <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                            <FormField control={control} name="calories" render={({ field }) => ( <FormItem><FormLabel>Calories</FormLabel><FormControl><Input type="number" placeholder="kcal" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={control} name="protein" render={({ field }) => ( <FormItem><FormLabel>Protein</FormLabel><FormControl><Input type="number" placeholder="grams" {...field} /></FormControl><FormMessage /></FormItem> )} />
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <FormField control={control} name="carbs" render={({ field }) => ( <FormItem><FormLabel>Carbs</FormLabel><FormControl><Input type="number" placeholder="grams" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={control} name="fat" render={({ field }) => ( <FormItem><FormLabel>Fat</FormLabel><FormControl><Input type="number" placeholder="grams" {...field} /></FormControl><FormMessage /></FormItem> )} />
                         </div>
                    </CollapsibleContent>
                </Collapsible>
                
                </div>
            </ScrollArea>
             <DialogFooter className="mt-4 sm:justify-between flex-wrap gap-2">
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsMoveDialogOpen(true)}>
                      <Move className="mr-2 h-4 w-4" /> Move To...
                  </Button>
                   <Button type="button" variant="outline" className="text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive" onClick={() => setIsSpoilageDialogOpen(true)}>
                      <Biohazard className="mr-2 h-4 w-4" /> Report Spoilage
                  </Button>
                </div>
                <div className="flex gap-2">
                    <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isPending || !isDirty}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </div>
            </DialogFooter>
        </form>
        </Form>
      </DialogContent>
    </Dialog>
    {isMoveDialogOpen && (
        <MoveItemDialog
            isOpen={isMoveDialogOpen}
            setIsOpen={setIsMoveDialogOpen}
            group={group}
            packageGroups={packageGroups}
            onUpdateComplete={async () => {
                 const { privateItems, sharedItems } = await getClientInventory();
                 onUpdateComplete(privateItems, sharedItems);
                 setIsOpen(false);
            }}
        />
    )}

    {isSpoilageDialogOpen && (
        <ReportSpoilageDialog
            isOpen={isSpoilageDialogOpen}
            setIsOpen={setIsSpoilageDialogOpen}
            group={group}
            packageGroups={packageGroups}
            onUpdateComplete={async () => {
                const { privateItems, sharedItems } = await getClientInventory();
                onUpdateComplete(privateItems, sharedItems);
                setIsOpen(false);
            }}
        />
     )}

    <AlertDialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently remove all {groupToDelete}{group.unit} containers of {group.name}. This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDelete} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
                    {isPending ? "Removing..." : "Remove"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
