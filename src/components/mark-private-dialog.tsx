
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
import type { InventoryItemGroup, InventoryPackageGroup, HouseholdMember, MarkPrivateRequest } from "@/lib/types";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import { Loader2, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
// import { handleMarkItemsPrivate } from "@/app/actions"; // This action needs to be created
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";

export function MarkPrivateDialog({
  isOpen,
  setIsOpen,
  group,
  packageGroups,
  householdMembers,
  onUpdateComplete,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  group: InventoryItemGroup;
  packageGroups: Record<number, InventoryPackageGroup>;
  householdMembers: HouseholdMember[];
  onUpdateComplete: (newInventory: any) => void;
}) {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const [ownerId, setOwnerId] = useState<string>('');

  const { control, handleSubmit, watch } = useForm();
  
  const onSubmit = async (data: any) => {
    if (!ownerId) {
      toast({ variant: "destructive", title: "No owner selected", description: "Please select a household member." });
      return;
    }
    
    const owner = householdMembers.find(m => m.id === ownerId);
    if (!owner) return;

    const request: MarkPrivateRequest = {
        ownerId: owner.id,
        ownerName: owner.name,
        packages: [],
    };
    
    // This is complex, will need a dedicated server action. For now, we'll just log it.
    console.log("Submitting private request for:", owner, data);

    toast({
      title: "Action Not Implemented",
      description: "This feature is not yet connected to the backend.",
    });

    // In a real app:
    // setIsPending(true);
    // const result = await handleMarkItemsPrivate(request);
    // setIsPending(false);

    // if (result.success && result.newInventory) {
    //   toast({ title: "Items Marked Private", description: `Ownership of ${group.name} updated.` });
    //   onUpdateComplete(result.newInventory);
    //   setIsOpen(false);
    // } else {
    //   toast({ variant: "destructive", title: "Update Failed", description: result.error });
    // }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Mark {group.name} as Private</DialogTitle>
          <DialogDescription>
            Select a household member and choose which packages to assign to them.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
            <ScrollArea className="h-96 pr-6 my-4">
                <div className="space-y-8">
                    <div className="space-y-2">
                        <Label htmlFor="destination">Owner</Label>
                        <Select onValueChange={setOwnerId} value={ownerId}>
                            <SelectTrigger id="destination">
                                <SelectValue placeholder="Select a household member..." />
                            </SelectTrigger>
                            <SelectContent>
                                {householdMembers.map(member => (
                                    <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {Object.values(packageGroups).map(({ size, fullPackages, partialPackage }) => (
                        <div key={size} className="space-y-4 p-4 border rounded-lg">
                            <h4 className="font-semibold text-lg">{size}{group.unit} Containers</h4>
                            
                            {fullPackages.map((pkg, index) => (
                                <Controller
                                    key={pkg.id}
                                    name={`full-${pkg.id}`}
                                    control={control}
                                    defaultValue={false}
                                    render={({ field }) => (
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id={field.name}
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                            <Label htmlFor={field.name} className="font-normal">
                                                Full Package #{index + 1}
                                            </Label>
                                        </div>
                                    )}
                                />
                            ))}

                            {partialPackage && (
                                <div className="space-y-2">
                                    <Label>Partial Package Amount</Label>
                                    <Controller
                                        name={`partial-${partialPackage.id}`}
                                        control={control}
                                        defaultValue={0}
                                        render={({ field }) => (
                                            <Input
                                                type="number"
                                                min="0"
                                                max={partialPackage.totalQuantity}
                                                step="any"
                                                {...field}
                                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                            />
                                        )}
                                    />
                                     <p className="text-sm text-muted-foreground">{partialPackage.totalQuantity.toFixed(2)}{group.unit} available in this package</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </ScrollArea>
             <DialogFooter className="mt-4">
                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isPending}>
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                    Confirm Ownership
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
