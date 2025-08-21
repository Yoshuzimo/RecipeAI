
"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { InventoryItem, InventoryItemGroup, InventoryPackageGroup, StorageLocation, MoveRequest } from "@/lib/types";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import { Loader2, Move } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { handleMoveInventoryItems } from "@/app/actions";
import { getClientStorageLocations } from "@/app/actions";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useEffect } from "react";

export function MoveItemDialog({
  isOpen,
  setIsOpen,
  group,
  packageGroups,
  onUpdateComplete,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  group: InventoryItemGroup;
  packageGroups: Record<number, InventoryPackageGroup & { items: InventoryItem[] }>;
  onUpdateComplete: (newInventory: InventoryItem[]) => void;
}) {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const [destinationId, setDestinationId] = useState<string>('');
  const [allLocations, setAllLocations] = useState<StorageLocation[]>([]);

  const { control, handleSubmit } = useForm();
  
  useEffect(() => {
    async function fetchLocations() {
      const locations = await getClientStorageLocations();
      setAllLocations(locations);
    }
    fetchLocations();
  }, []);

  const currentLocations = new Set(group.items.map(item => item.locationId));
  const availableDestinations = allLocations.filter(loc => !currentLocations.has(loc.id));

  const onSubmit = async (data: any) => {
    if (!destinationId) {
      toast({ variant: "destructive", title: "No destination selected", description: "Please select a location to move the items to." });
      return;
    }

    // Structure the data for the server action
    const moveRequest: MoveRequest = {};
    for (const sizeStr in data) {
        const size = Number(sizeStr);
        if (data[size] && (data[size].full > 0 || data[size].partial > 0)) {
            moveRequest[size] = {
                fullPackagesToMove: data[size].full,
                partialAmountToMove: data[size].partial,
                source: packageGroups[size],
            };
        }
    }
    
    if (Object.keys(moveRequest).length === 0) {
       toast({ variant: "destructive", title: "Nothing to move", description: "Please specify a quantity to move." });
       return;
    }

    setIsPending(true);
    const result = await handleMoveInventoryItems(moveRequest, destinationId);
    setIsPending(false);

    if (result.success && result.newInventory) {
      toast({ title: "Items Moved", description: `${group.name} has been moved successfully.` });
      onUpdateComplete(result.newInventory);
      setIsOpen(false);
    } else {
      toast({ variant: "destructive", title: "Move Failed", description: result.error });
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Move {group.name}</DialogTitle>
          <DialogDescription>
            Select a destination and choose which packages to move.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
            <ScrollArea className="h-96 pr-6 my-4">
                <div className="space-y-8">
                    <div className="space-y-2">
                        <Label htmlFor="destination">Destination</Label>
                        <Select onValueChange={setDestinationId} value={destinationId}>
                            <SelectTrigger id="destination">
                                <SelectValue placeholder="Select a location..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableDestinations.map(loc => (
                                    <SelectItem key={loc.id} value={loc.id}>{loc.name} ({loc.type})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {Object.values(packageGroups).map(({ size, fullPackages, partialPackage }) => (
                        <div key={size} className="space-y-4 p-4 border rounded-lg">
                            <h4 className="font-semibold text-lg">{size}{group.unit} Containers</h4>
                             <Controller
                                name={`${size}.full`}
                                control={control}
                                defaultValue={0}
                                render={({ field }) => (
                                    <div className="space-y-2">
                                        <Label>Full Packages to Move</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            max={fullPackages.length}
                                            step="1"
                                            {...field}
                                            onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                                        />
                                        <p className="text-sm text-muted-foreground">{fullPackages.length} available</p>
                                    </div>
                                )}
                            />
                            {partialPackage && (
                                <Controller
                                    name={`${size}.partial`}
                                    control={control}
                                    defaultValue={0}
                                    render={({ field }) => (
                                        <div className="space-y-2">
                                            <Label>Amount from Partial to Move</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                max={partialPackage.totalQuantity}
                                                step="any"
                                                {...field}
                                                 onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                            />
                                            <p className="text-sm text-muted-foreground">{partialPackage.totalQuantity.toFixed(2)}{group.unit} available</p>
                                        </div>
                                    )}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </ScrollArea>
             <DialogFooter className="mt-4">
                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isPending}>
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Move className="mr-2 h-4 w-4" />}
                    Confirm Move
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}