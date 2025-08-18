
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
import type { InventoryItemGroup, InventoryPackageGroup, MoveRequest } from "@/lib/types";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import { Loader2, Biohazard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { handleReportSpoilage } from "@/app/actions";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function ReportSpoilageDialog({
  isOpen,
  setIsOpen,
  group,
  packageGroups,
  onUpdateComplete,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  group: InventoryItemGroup;
  packageGroups: Record<number, InventoryPackageGroup>;
  onUpdateComplete: (newInventory: any) => void;
}) {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);

  const { control, handleSubmit } = useForm();

  const onSubmit = async (data: any) => {
    const spoilageRequest: any = {};
    let totalSpoiled = 0;

    for (const sizeStr in data) {
        const size = Number(sizeStr);
        if (data[size] && (data[size].full > 0 || data[size].partial > 0)) {
            spoilageRequest[size] = {
                fullPackagesToSpoil: data[size].full || 0,
                partialAmountToSpoil: data[size].partial || 0,
                source: packageGroups[size],
            };
            totalSpoiled += (data[size].full || 0) + (data[size].partial || 0);
        }
    }

    if (totalSpoiled === 0) {
        toast({
            variant: "destructive",
            title: "Nothing to report",
            description: "Please specify an amount of spoilage to report.",
        });
        return;
    }

    setIsPending(true);
    const result = await handleReportSpoilage(spoilageRequest);
    setIsPending(false);

    if (result.success && result.newInventory) {
      toast({ title: "Spoilage Reported", description: `Inventory for ${group.name} has been updated.` });
      onUpdateComplete(result.newInventory);
      setIsOpen(false);
    } else {
      toast({ variant: "destructive", title: "Reporting Failed", description: result.error });
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Report Spoilage for {group.name}</DialogTitle>
          <DialogDescription>
            Specify how many full packages and/or what amount of a partial package has spoiled. This will remove it from your inventory.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
            <ScrollArea className="h-96 pr-6 my-4">
                <div className="space-y-8">
                    {Object.values(packageGroups).map(({ size, fullPackages, partialPackage }) => (
                        <div key={size} className="space-y-4 p-4 border rounded-lg">
                            <h4 className="font-semibold text-lg">{size}{group.unit} Containers</h4>
                             <Controller
                                name={`${size}.full`}
                                control={control}
                                defaultValue={0}
                                render={({ field }) => (
                                    <div className="space-y-2">
                                        <Label>Full Packages to Spoil</Label>
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
                                            <Label>Amount from Partial to Spoil</Label>
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
                <Button type="submit" disabled={isPending} variant="destructive">
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Biohazard className="mr-2 h-4 w-4" />}
                    Confirm Spoilage
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
