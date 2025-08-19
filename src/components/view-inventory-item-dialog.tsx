

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
import type { InventoryItem, InventoryItemGroup, InventoryPackageGroup, StorageLocation, HouseholdMember } from "@/lib/types";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import { Loader2, Trash2, Move, Biohazard, Share2, User, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { handleUpdateInventoryGroup, handleRemoveInventoryPackageGroup, handleToggleItemPrivacy, getClientHousehold } from "@/app/actions";
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
import { getClientStorageLocations } from "@/app/actions";
import { MarkPrivateDialog } from "./mark-private-dialog";
import { Switch } from "./ui/switch";
import { cn } from "@/lib/utils";

const formSchema = z.record(z.string(), z.object({
    full: z.coerce.number().int().min(0),
    partial: z.coerce.number().min(0),
}));

type FormData = z.infer<typeof formSchema>;

// List of keywords for items that are typically not divisible when measured in 'pcs'
const nonDivisibleKeywords = ['egg', 'eggs'];

export function ViewInventoryItemDialog({
  isOpen,
  setIsOpen,
  group,
  onUpdateComplete,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  group: InventoryItemGroup;
  onUpdateComplete: (newInventory: InventoryItem[]) => void;
}) {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<number | null>(null);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [isSpoilageDialogOpen, setIsSpoilageDialogOpen] = useState(false);
  const [isMarkPrivateDialogOpen, setIsMarkPrivateDialogOpen] = useState(false);
  const [isInHousehold, setIsInHousehold] = useState(false);
  const [isPrivateStaged, setIsPrivateStaged] = useState(group.isPrivate);
  const [isPrivacyChanged, setIsPrivacyChanged] = useState(false);


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
            // Assuming only one partial container per size for simplicity in this UI model
            acc[size].partialPackage = item;
        }
        return acc;
    }, {} as Record<number, InventoryPackageGroup & { items: InventoryItem[] }>);
  }, [group.items]);

  const defaultValues = useMemo(() => {
    const values: FormData = {};
    for (const pkgGroup of Object.values(packageGroups)) {
      values[pkgGroup.size] = {
        full: pkgGroup.fullPackages.length,
        partial: pkgGroup.partialPackage?.totalQuantity ?? 0,
      };
    }
    return values;
  }, [packageGroups]);
  
  const { control, handleSubmit, watch, formState: {isDirty}, reset } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });
  
  useEffect(() => {
    // Reset form and privacy state when a new group is passed in
    reset(defaultValues);
    setIsPrivateStaged(group.isPrivate);
    setIsPrivacyChanged(false);

    async function checkHousehold() {
      const household = await getClientHousehold();
      setIsInHousehold(!!household);
    }
    checkHousehold();
  }, [group, defaultValues, reset]);


  const watchedValues = watch();

  const handlePrivacySwitchChange = (checked: boolean) => {
      setIsPrivateStaged(checked);
      // Compare to the original state to see if there's a change
      setIsPrivacyChanged(checked !== group.isPrivate);
  }

  const handleSavePrivacyChange = async () => {
    setIsPending(true);
    const result = await handleToggleItemPrivacy(group.items, isPrivateStaged);
    setIsPending(false);

    if (result.success && result.newInventory) {
      toast({ title: "Privacy Updated", description: `${group.name} has been moved.` });
      onUpdateComplete(result.newInventory);
      setIsPrivacyChanged(false); // Reset changed state
      // The dialog will close if the group no longer exists.
      // If it still exists (e.g. some packages moved), its props will update.
      const newGroupExists = result.newInventory.some(item => item.name === group.name && item.unit === group.unit && item.isPrivate === isPrivateStaged);
      if (!newGroupExists) {
        setIsOpen(false);
      }
    } else {
      toast({ variant: "destructive", title: "Update Failed", description: result.error });
    }
  };


  const onSubmit = async (data: FormData) => {
    setIsPending(true);
    const result = await handleUpdateInventoryGroup(group.items, data, group.name, group.unit);
    setIsPending(false);

    if (result.success && result.newInventory) {
        toast({ title: "Inventory Updated", description: `${group.name} has been updated successfully.` });
        onUpdateComplete(result.newInventory);
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

    if (result.success && result.newInventory) {
      toast({ title: "Package Size Removed", description: `All ${groupToDelete}${group.unit} containers of ${group.name} have been removed.` });
      onUpdateComplete(result.newInventory);
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
            Adjust quantities, move items, or change privacy settings.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
            <ScrollArea className="h-96 pr-6 my-4">
                <div className="space-y-8">
                 {isInHousehold && (
                    <div className={cn("flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg border p-4 gap-4 transition-all", isPrivacyChanged && "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900")}>
                        <div className="space-y-0.5">
                            <Label htmlFor="privacy-toggle" className="text-base flex items-center gap-2">
                                {isPrivateStaged ? <User className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                                {isPrivateStaged ? "Item is Private" : "Item is Shared"}
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                {isPrivateStaged ? "This item is only visible to you." : "This item is visible to your household."}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                           {isPrivacyChanged && <Button size="sm" type="button" onClick={handleSavePrivacyChange} disabled={isPending}><Save className="h-4 w-4 mr-2"/>Save Privacy</Button>}
                            <Switch
                                id="privacy-toggle"
                                checked={isPrivateStaged}
                                onCheckedChange={handlePrivacySwitchChange}
                                disabled={isPending}
                            />
                        </div>
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
                </div>
            </ScrollArea>
             <DialogFooter className="mt-4 sm:justify-between flex-wrap gap-2">
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsMoveDialogOpen(true)}>
                      <Move className="mr-2 h-4 w-4" /> Move
                  </Button>
                   <Button type="button" variant="outline" className="text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive" onClick={() => setIsSpoilageDialogOpen(true)}>
                      <Biohazard className="mr-2 h-4 w-4" /> Report Spoilage
                  </Button>
                </div>
                <div className="flex gap-2">
                    <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isPending || !isDirty}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Quantity Changes
                    </Button>
                </div>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    {isMoveDialogOpen && (
        <MoveItemDialog
            isOpen={isMoveDialogOpen}
            setIsOpen={setIsMoveDialogOpen}
            group={group}
            packageGroups={packageGroups}
            onUpdateComplete={(newInventory) => {
                onUpdateComplete(newInventory);
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
            onUpdateComplete={(newInventory) => {
                onUpdateComplete(newInventory);
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
