
"use client";

import { useState, useMemo } from "react";
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
import type { InventoryItem, InventoryItemGroup, InventoryPackageGroup } from "@/lib/types";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { handleUpdateInventoryGroup } from "@/app/actions";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";

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

  const packageGroups = useMemo(() => {
    return group.items.reduce((acc, item) => {
        const size = item.originalQuantity;
        if (!acc[size]) {
            acc[size] = {
                size: size,
                fullPackages: [],
                partialPackage: null,
            };
        }
        if (item.totalQuantity === item.originalQuantity) {
            acc[size].fullPackages.push(item);
        } else {
            // Assuming only one partial container per size for simplicity in this UI model
            acc[size].partialPackage = item;
        }
        return acc;
    }, {} as Record<number, InventoryPackageGroup>);
  }, [group.items]);

  const defaultValues = useMemo(() => {
    return Object.values(packageGroups).reduce((acc, pkgGroup) => {
        acc[pkgGroup.size] = {
            full: pkgGroup.fullPackages.length,
            partial: pkgGroup.partialPackage?.totalQuantity ?? 0,
        };
        return acc;
    }, {} as FormData);
  }, [packageGroups]);
  
  const { control, handleSubmit, watch, formState: {isDirty} } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const watchedValues = watch();

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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage {group.name}</DialogTitle>
          <DialogDescription>
            Adjust the number of full containers and the quantity of partial containers.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
            <ScrollArea className="h-96 pr-6 my-4">
                <div className="space-y-8">
                {Object.keys(packageGroups).length > 0 ? (
                    Object.values(packageGroups).map(({ size }) => (
                        <div key={size} className="space-y-4 p-4 border rounded-lg">
                            <h4 className="font-semibold text-lg">{size}{group.unit} Containers</h4>
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
                                render={({ field: { onChange, value } }) => (
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
                                                step={isNonDivisiblePiece(group.name, group.unit) ? 1 : size / 100}
                                                className="flex-1"
                                            />
                                            <Input
                                                type="number"
                                                value={value}
                                                onChange={(e) => {
                                                    const numValue = parseFloat(e.target.value);
                                                    if (!isNaN(numValue)) {
                                                        onChange(numValue);
                                                    }
                                                }}
                                                 onBlur={(e) => {
                                                    let numValue = parseFloat(e.target.value);
                                                    if (isNaN(numValue) || numValue < 0) {
                                                        numValue = 0;
                                                    } else if (numValue > size) {
                                                        numValue = size;
                                                    }
                                                    onChange(numValue);
                                                }}
                                                className="w-28"
                                                step={isNonDivisiblePiece(group.name, group.unit) ? 1 : "0.01"}
                                            />
                                        </div>
                                    </div>
                                )}
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
             <DialogFooter className="mt-4">
                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isPending || !isDirty}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
