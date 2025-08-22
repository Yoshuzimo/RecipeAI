

"use client";

import * as React from "react";
import MainLayout from "@/components/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Copy, Check, X, Loader2, GitMerge, Inbox, History, PackageCheck, PackageX, ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getClientHousehold, handleCreateHousehold, handleJoinHousehold, handleLeaveHousehold, handleApproveMember, handleRejectMember, handleApproveAndMerge, getClientInventory, handleReviewLeaveRequest, getClientStorageLocations } from "@/app/actions";
import { Separator } from "@/components/ui/separator";
import type { Household, InventoryItem, RequestedItem, LeaveRequest, StorageLocation, ItemMigrationMapping } from "@/lib/types";
import { useAuth } from "@/components/auth-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";


export const dynamic = 'force-dynamic';

const MapLocationsDialog = ({
    isOpen,
    setIsOpen,
    userInventory,
    userLocations,
    householdLocations,
    onConfirm,
}: {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    userInventory: InventoryItem[];
    userLocations: StorageLocation[];
    householdLocations: StorageLocation[];
    onConfirm: (mapping: ItemMigrationMapping) => void;
}) => {
    const [mapping, setMapping] = React.useState<ItemMigrationMapping>({});
    const [currentPage, setCurrentPage] = React.useState(0);
    const itemsPerPage = 10;

    const userLocationMap = React.useMemo(() => new Map(userLocations.map(l => [l.id, l.name])), [userLocations]);

    React.useEffect(() => {
        const initialMapping: ItemMigrationMapping = {};
        userInventory.forEach(item => {
            const currentLocName = userLocationMap.get(item.locationId);
            const defaultTarget = householdLocations.find(hl => hl.name === currentLocName);
            initialMapping[item.id] = {
                newLocationId: defaultTarget?.id || '',
                keepPrivate: true, // Default to keeping items private
            };
        });
        setMapping(initialMapping);
    }, [userInventory, householdLocations, userLocationMap]);

    const handleMappingChange = (itemId: string, field: keyof ItemMigrationMapping[string], value: string | boolean) => {
        setMapping(prev => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                [field]: value
            }
        }));
    };

    const totalPages = Math.ceil(userInventory.length / itemsPerPage);
    const paginatedInventory = userInventory.slice(
        currentPage * itemsPerPage,
        (currentPage + 1) * itemsPerPage
    );

    const handleConfirm = () => {
        for (const item of userInventory) {
            if (!mapping[item.id] || !mapping[item.id].newLocationId) {
                toast({
                    variant: "destructive",
                    title: "Incomplete Mapping",
                    description: `Please map a new location for "${item.name}".`
                });
                const itemIndex = userInventory.findIndex(i => i.id === item.id);
                const pageIndex = Math.floor(itemIndex / itemsPerPage);
                setCurrentPage(pageIndex);
                return;
            }
        }
        onConfirm(mapping);
    };
    
    const { toast } = useToast();

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Migrate Your Inventory</DialogTitle>
                    <DialogDescription>
                        Your items need a home in the new household. Map them to a new location and decide if they should be shared or kept private.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-96 my-4 pr-4">
                    <div className="space-y-4">
                        {paginatedInventory.map(item => (
                            <div key={item.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-3 border rounded-md">
                                <div className="md:col-span-1">
                                    <p className="font-semibold">{item.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        From: {userLocationMap.get(item.locationId) || 'Unknown'}
                                    </p>
                                </div>
                                <div className="md:col-span-1">
                                    <Select 
                                        value={mapping[item.id]?.newLocationId || ''} 
                                        onValueChange={value => handleMappingChange(item.id, 'newLocationId', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select new location..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {householdLocations.map(loc => (
                                                <SelectItem key={loc.id} value={loc.id}>{loc.name} ({loc.type})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="md:col-span-1 flex items-center justify-end space-x-2">
                                    <Checkbox
                                        id={`private-${item.id}`}
                                        checked={mapping[item.id]?.keepPrivate ?? true}
                                        onCheckedChange={checked => handleMappingChange(item.id, 'keepPrivate', !!checked)}
                                    />
                                    <Label htmlFor={`private-${item.id}`} className="font-normal text-sm">
                                        Keep Private
                                    </Label>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <div className="flex justify-between items-center mt-4">
                    <Button
                        variant="outline"
                        onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                        disabled={currentPage === 0}
                    >
                       <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        Page {currentPage + 1} of {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={currentPage === totalPages - 1}
                    >
                        Next <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
                <DialogFooter className="mt-4">
                    <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleConfirm}>Confirm & Join</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const NoHouseholdView = ({
    onTriggerCreateConfirmation,
    onTriggerJoinConfirmation,
    isCreating,
    isJoining,
    joinCode,
    setJoinCode
}: {
    onTriggerCreateConfirmation: () => void;
    onTriggerJoinConfirmation: () => void;
    isCreating: boolean;
    isJoining: boolean;
    joinCode: string;
    setJoinCode: (code: string) => void;
}) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
            <CardHeader>
                <CardTitle>Create a Household</CardTitle>
                <CardDescription>Start a new household and invite your family or roommates to join.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={onTriggerCreateConfirmation} disabled={isCreating} className="w-full">
                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Household
                </Button>
            </CardContent>
        </Card>
            <Card>
            <CardHeader>
                <CardTitle>Join a Household</CardTitle>
                <CardDescription>Enter an invite code from an existing household to join it.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2">
                    <Input 
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        placeholder="Enter 4-digit code"
                        maxLength={4}
                        className="uppercase tracking-widest font-mono"
                    />
                    <Button onClick={onTriggerJoinConfirmation} disabled={isJoining || joinCode.length < 4}>
                        {isJoining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Join
                    </Button>
                </div>
            </CardContent>
        </Card>
    </div>
);

const LoadingSkeleton = () => (
    <Card>
        <CardHeader>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-3/4 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-40" />
            </div>
            <Separator />
            <Skeleton className="h-6 w-1/3" />
             <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                </div>
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                </div>
            </div>
             <Separator />
             <Skeleton className="h-10 w-40" />
        </CardContent>
    </Card>
);

const TakeItemsDialog = ({ 
    isOpen, 
    setIsOpen, 
    inventory, 
    onConfirm,
}: {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    inventory: InventoryItem[];
    onConfirm: (items: RequestedItem[]) => void;
}) => {
    const [selectedItems, setSelectedItems] = React.useState<Record<string, number>>({});

    const handleConfirm = () => {
        const itemsToTake: RequestedItem[] = Object.entries(selectedItems)
            .filter(([, quantity]) => quantity > 0)
            .map(([id, quantity]) => {
                const item = inventory.find(i => i.id === id)!;
                return {
                    originalItemId: id,
                    name: item.name,
                    quantity: quantity,
                    unit: item.unit
                };
            });
        onConfirm(itemsToTake);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Take Items With You</DialogTitle>
                    <DialogDescription>Select any shared items and quantities you wish to take from the household inventory. These will be added to your personal inventory.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-96 pr-4 my-4">
                    <div className="space-y-4">
                        {inventory.length > 0 ? inventory.map(item => (
                            <div key={item.id} className="p-3 border rounded-md">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor={`item-${item.id}`}>{item.name}</Label>
                                    <span className="text-sm text-muted-foreground">{item.totalQuantity.toFixed(2)} {item.unit} available</span>
                                </div>
                                <Input
                                    id={`item-${item.id}`}
                                    type="number"
                                    min={0}
                                    max={item.totalQuantity}
                                    step="any"
                                    value={selectedItems[item.id] || ''}
                                    placeholder="0"
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setSelectedItems(prev => ({ ...prev, [item.id]: isNaN(val) ? 0 : Math.max(0, Math.min(val, item.totalQuantity)) }))
                                    }}
                                    className="mt-2"
                                />
                            </div>
                        )) : (
                            <p className="text-center text-muted-foreground py-8">There are no shared items to take.</p>
                        )}
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleConfirm}>Continue</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const RemapLeavingItemsDialog = ({
    isOpen,
    setIsOpen,
    itemsToRemap, // This includes user's private items + items they're taking
    personalLocations,
    onConfirm,
}: {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    itemsToRemap: InventoryItem[];
    personalLocations: StorageLocation[];
    onConfirm: (mapping: Record<string, string>) => void;
}) => {
    const [mapping, setMapping] = React.useState<Record<string, string>>({});
    const { toast } = useToast();

    React.useEffect(() => {
        // Pre-fill mapping based on type if possible
        const initialMapping: Record<string, string> = {};
        const locationMap = new Map(personalLocations.map(l => [l.type, l.id]));
        itemsToRemap.forEach(item => {
            // Find a location of the same type (Fridge, etc.) in the personal locations
            // This is a bit of a guess and might need more robust logic
            const targetLocation = personalLocations.find(l => l.name.includes(item.locationId)) || personalLocations[0];
            if (targetLocation) {
                initialMapping[item.id] = targetLocation.id;
            }
        });
        setMapping(initialMapping);
    }, [itemsToRemap, personalLocations]);

    const handleConfirm = () => {
        for (const item of itemsToRemap) {
            if (!mapping[item.id]) {
                toast({
                    variant: "destructive",
                    title: "Incomplete Mapping",
                    description: `Please map a new location for "${item.name}".`
                });
                return;
            }
        }
        onConfirm(mapping);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Organize Your Inventory</DialogTitle>
                    <DialogDescription>You're leaving the household. Please assign your items to your personal storage locations.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-96 my-4 pr-4">
                    <div className="space-y-4">
                        {itemsToRemap.map(item => (
                            <div key={item.id} className="grid grid-cols-2 gap-4 items-center p-3 border rounded-md">
                                <p className="font-semibold">{item.name}</p>
                                <Select 
                                    value={mapping[item.id] || ''} 
                                    onValueChange={value => setMapping(prev => ({ ...prev, [item.id]: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select new location..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {personalLocations.map(loc => (
                                            <SelectItem key={loc.id} value={loc.id}>{loc.name} ({loc.type})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleConfirm}>Confirm & Leave Household</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const ApproveMergeDialog = ({
    isOpen,
    setIsOpen,
    itemsToMerge,
    onConfirm,
}: {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    itemsToMerge: InventoryItem[];
    onConfirm: (approvedItemIds: string[]) => void;
}) => {
    const [selectedIds, setSelectedIds] = React.useState<Record<string, boolean>>({});
    const [areAllSelected, setAreAllSelected] = React.useState(true);

    React.useEffect(() => {
        // Initially, all items are selected
        const initialSelection: Record<string, boolean> = {};
        itemsToMerge.forEach(item => {
            initialSelection[item.id] = true;
        });
        setSelectedIds(initialSelection);
        setAreAllSelected(true);
    }, [itemsToMerge]);

    const handleToggleAll = (checked: boolean) => {
        setAreAllSelected(checked);
        const newSelection: Record<string, boolean> = {};
        itemsToMerge.forEach(item => {
            newSelection[item.id] = checked;
        });
        setSelectedIds(newSelection);
    };

    const handleItemToggle = (itemId: string, checked: boolean) => {
        const newSelection = { ...selectedIds, [itemId]: checked };
        setSelectedIds(newSelection);
        setAreAllSelected(Object.values(newSelection).every(v => v));
    };

    const handleConfirm = () => {
        const approvedIds = Object.entries(selectedIds)
            .filter(([, isSelected]) => isSelected)
            .map(([id]) => id);
        onConfirm(approvedIds);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Review Items to Merge</DialogTitle>
                    <DialogDescription>Select the items you want to add to the household inventory. Unchecked items will remain in the user's private inventory.</DialogDescription>
                </DialogHeader>
                <div className="flex items-center space-x-2 my-4">
                    <Switch id="toggle-all" checked={areAllSelected} onCheckedChange={handleToggleAll} />
                    <Label htmlFor="toggle-all">Toggle All Items</Label>
                </div>
                <ScrollArea className="h-96 pr-4">
                    <div className="space-y-2">
                        {itemsToMerge.map(item => (
                            <div key={item.id} className="flex items-center space-x-3 rounded-md border p-4">
                                <Checkbox
                                    id={`merge-${item.id}`}
                                    checked={selectedIds[item.id] ?? false}
                                    onCheckedChange={(checked) => handleItemToggle(item.id, !!checked)}
                                />
                                <Label htmlFor={`merge-${item.id}`} className="font-normal flex-1">
                                    {item.name} <span className="text-muted-foreground">({item.totalQuantity} {item.unit})</span>
                                </Label>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleConfirm}><GitMerge className="mr-2 h-4 w-4" />Approve & Merge Selected</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

const ReviewLeaveRequestDialog = ({ isOpen, setIsOpen, request, onProcess }: {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    request: LeaveRequest;
    onProcess: (requestId: string, approve: boolean) => void;
}) => {
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Review Items Taken by {request.userName}</DialogTitle>
                    <DialogDescription>
                        {request.userName} has left the household and taken the items below. Approving will deduct them from the household inventory.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-72 my-4">
                    <ul className="list-disc list-inside space-y-2">
                        {request.requestedItems.map(item => (
                            <li key={item.originalItemId}>
                                <span className="font-semibold">{item.name}</span>: {item.quantity} {item.unit}
                            </li>
                        ))}
                    </ul>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="destructive" onClick={() => onProcess(request.requestId, false)}><PackageX className="mr-2 h-4 w-4" />Don't Deduct</Button>
                    <Button onClick={() => onProcess(request.requestId, true)}><PackageCheck className="mr-2 h-4 w-4" />Deduct from Inventory</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function HouseholdPage() {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = React.useState(true);
    const [isCreateConfirmOpen, setIsCreateConfirmOpen] = React.useState(false);
    const [isLeaveAlertOpen, setIsLeaveAlertOpen] = React.useState(false);
    
    // --- New State for Multi-step Dialogs ---
    const [leaveStep, setLeaveStep] = React.useState<'initial' | 'take_items' | 'remap_items'>('initial');
    const [itemsToTake, setItemsToTake] = React.useState<RequestedItem[]>([]);
    const [itemsToRemap, setItemsToRemap] = React.useState<InventoryItem[]>([]);

    const [approveMergeStep, setApproveMergeStep] = React.useState<'initial' | 'confirm_merge'>('initial');
    const [memberToMerge, setMemberToMerge] = React.useState<{id: string, name: string} | null>(null);
    const [inventoryToMerge, setInventoryToMerge] = React.useState<InventoryItem[]>([]);
    // --- End New State ---

    const [isCreating, setIsCreating] = React.useState(false);
    const [isJoining, setIsJoining] = React.useState(false);
    const [isProcessingRequest, setIsProcessingRequest] = React.useState<string | null>(null);
    const [joinCode, setJoinCode] = React.useState("");
    const [currentHousehold, setCurrentHousehold] = React.useState<Household | null>(null);
    const [allInventory, setAllInventory] = React.useState<{privateItems: InventoryItem[], sharedItems: InventoryItem[]}>({privateItems: [], sharedItems: []});
    const [userLocations, setUserLocations] = React.useState<StorageLocation[]>([]);
    const [householdToJoin, setHouseholdToJoin] = React.useState<Household | null>(null);
    const [isMapLocationsOpen, setIsMapLocationsOpen] = React.useState(false);
    
    const [newOwnerId, setNewOwnerId] = React.useState<string>("");
    const [reviewRequest, setReviewRequest] = React.useState<LeaveRequest | null>(null);

    const { toast } = useToast();
    
    const fetchHouseholdData = React.useCallback(async () => {
        if (user) {
            try {
                const household = await getClientHousehold();
                setCurrentHousehold(household);
                const inventoryData = await getClientInventory();
                setAllInventory(inventoryData);
                const locations = await getClientStorageLocations();
                setUserLocations(locations);
            } catch(e) {
                console.error("Failed to fetch household data", e);
                toast({variant: "destructive", title: "Error", description: "Could not fetch household information."})
            } finally {
                setIsLoading(false);
            }
        }
    }, [user, toast]);

    React.useEffect(() => {
        setIsLoading(true);
        fetchHouseholdData();
    }, [fetchHouseholdData]);

    const isOwner = user?.uid === currentHousehold?.ownerId;
    const otherMembers = currentHousehold?.activeMembers.filter(m => m.userId !== user?.uid) || [];

    const onCreateHousehold = async () => {
        setIsCreateConfirmOpen(false);
        setIsCreating(true);
        const result = await handleCreateHousehold();
        setIsCreating(false);

        if (result.success && result.household) {
            toast({
                title: "Household Created!",
                description: `Your new household invite code is ${result.household.inviteCode}.`,
            });
            setCurrentHousehold(result.household);
        } else {
            toast({
                variant: "destructive",
                title: "Creation Failed",
                description: result.error,
            });
        }
    };
    
    const handleTriggerJoin = async () => {
        if (joinCode.length < 4) return;
        setIsJoining(true);
        try {
            const res = await fetch(`/api/household/invite/${joinCode.toUpperCase()}`);
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Could not find a household with that invite code.");
            }
            const household = await res.json();
            
            setHouseholdToJoin(household);

            if (allInventory.privateItems.length === 0) {
                await onJoinHousehold(false, {});
            } else {
                setIsMapLocationsOpen(true);
            }
        } catch (e) {
            toast({ variant: "destructive", title: "Failed to Join", description: e instanceof Error ? e.message : "Could not find household." });
        } finally {
            setIsJoining(false);
        }
    }


    const onJoinHousehold = async (mergeInventory: boolean, itemMigrationMapping: ItemMigrationMapping = {}) => {
        setIsJoining(true);
        setIsMapLocationsOpen(false);
        const result = await handleJoinHousehold(joinCode.toUpperCase(), mergeInventory, itemMigrationMapping);
        setIsJoining(false);

        if (result.success) {
            toast({
                title: "Request Sent!",
                description: `Your request to join household ${joinCode.toUpperCase()} has been sent for approval.`,
            });
            setJoinCode("");
        } else {
            toast({
                variant: "destructive",
                title: "Failed to Join",
                description: result.error,
            });
        }
    };
    
    // --- MODIFIED LEAVING LOGIC ---
    const handleBeginLeave = () => {
      setIsLeaveAlertOpen(false); // Close the first confirmation
      if (currentHousehold?.sharedInventory && currentHousehold.sharedInventory.length > 0) {
        setLeaveStep('take_items');
      } else {
        handleItemsToTakeConfirmed([]);
      }
    };

    const handleItemsToTakeConfirmed = (takenItems: RequestedItem[]) => {
      setItemsToTake(takenItems);
      const userPrivateItems = allInventory.privateItems;
      const allItemsToRemap = [...userPrivateItems]; // We need to remap private items as well

      const takenItemsAsInventory: InventoryItem[] = takenItems.map(item => {
        const original = allInventory.sharedItems.find(i => i.id === item.originalItemId)!;
        return { ...original, totalQuantity: item.quantity, originalQuantity: item.quantity };
      });
      allItemsToRemap.push(...takenItemsAsInventory);

      setItemsToRemap(allItemsToRemap);
      setLeaveStep('remap_items');
    };

    const onLeaveHousehold = async (locationMapping: Record<string, string>) => {
        if (isOwner && otherMembers.length > 0 && !newOwnerId) {
            toast({ variant: "destructive", title: "New Owner Required", description: "You must select a new owner before leaving."});
            return;
        }

        const result = await handleLeaveHousehold(itemsToTake, newOwnerId || undefined, locationMapping);
        if (result.success) {
            toast({
                title: "You have left the household."
            });
            setCurrentHousehold(null);
            setLeaveStep('initial');
            fetchHouseholdData(); // Re-fetch data to get user's standalone state
        } else {
            toast({
                variant: "destructive",
                title: "Failed to Leave",
                description: result.error,
            });
        }
        setNewOwnerId("");
    }
    
    const copyInviteCode = () => {
        if (currentHousehold?.inviteCode) {
            navigator.clipboard.writeText(currentHousehold.inviteCode);
            toast({ title: "Copied!", description: "Invite code copied to clipboard." });
        }
    }

    // --- MODIFIED APPROVE & MERGE LOGIC ---
    const handleBeginApproveAndMerge = async (memberId: string, memberName: string) => {
        setIsProcessingRequest(memberId);
        try {
            // A new action might be needed to just FETCH the member's private inventory
            // For now, let's assume we can get it. This is a simplification.
            // In a real scenario, this might need another action: `getPendingMemberInventory(memberId)`
            // which has security rules to only allow household owner to see it.
            // For this example, we'll use a placeholder.
            const memberInventory: InventoryItem[] = []; // Placeholder. This needs a real implementation.
            
            setInventoryToMerge(memberInventory);
            setMemberToMerge({ id: memberId, name: memberName });
            setApproveMergeStep('confirm_merge');

        } catch (e) {
             toast({ variant: "destructive", title: "Error", description: "Could not fetch member's inventory for merging." });
        } finally {
            setIsProcessingRequest(null);
        }
    };
    
    const onApproveAndMerge = async (approvedItemIds: string[]) => {
        if (!currentHousehold || !memberToMerge) return;
        setIsProcessingRequest(memberToMerge.id);
        setApproveMergeStep('initial');
        
        const result = await handleApproveAndMerge(currentHousehold.id, memberToMerge.id, approvedItemIds);
        if (result.success && result.household) {
            setCurrentHousehold(result.household);
            toast({ title: "Member Approved & Inventory Merged!" });
        } else {
            toast({ variant: "destructive", title: "Action Failed", description: result.error });
        }
        setIsProcessingRequest(null);
        setMemberToMerge(null);
    }
    
    const onApprove = async (memberId: string) => {
        if (!currentHousehold) return;
        setIsProcessingRequest(memberId);
        const result = await handleApproveMember(currentHousehold.id, memberId);
        if (result.success && result.household) {
            setCurrentHousehold(result.household);
            toast({ title: "Member Approved!" });
        } else {
            toast({ variant: "destructive", title: "Approval Failed", description: result.error });
        }
        setIsProcessingRequest(null);
    }

    const onReject = async (memberId: string) => {
        if (!currentHousehold) return;
        setIsProcessingRequest(memberId);
        const result = await handleRejectMember(currentHousehold.id, memberId);
            if (result.success && result.household) {
            setCurrentHousehold(result.household);
            toast({ title: "Member Rejected" });
        } else {
            toast({ variant: "destructive", title: "Rejection Failed", description: result.error });
        }
        setIsProcessingRequest(null);
    }

    const handleProcessLeaveRequest = async (requestId: string, approve: boolean) => {
        setReviewRequest(null); // Close dialog immediately
        const result = await handleReviewLeaveRequest(requestId, approve);
        if (result.success) {
            setCurrentHousehold(result.household);
            toast({ title: "Request Processed", description: `The inventory has been updated.` });
        } else {
            toast({ variant: "destructive", title: "Failed to Process", description: result.error });
        }
    };
    
    const InHouseholdView = () => (
            <Card>
            <CardHeader>
            <CardTitle>Your Household</CardTitle>
            <CardDescription>
                Manage your shared inventory, meals, and recipes with family.
            </CardDescription>
                <div className="flex items-center space-x-2 pt-4">
                    <Label htmlFor="invite-code" className="text-sm font-medium">Invite Code:</Label>
                    <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-1">
                    <span id="invite-code" className="text-lg font-mono font-bold tracking-widest">{currentHousehold?.inviteCode}</span>
                    <Button variant="ghost" size="icon" onClick={copyInviteCode}>
                        <Copy className="h-4 w-4" />
                    </Button>
                    </div>
            </div>
            </CardHeader>
            <CardContent className="space-y-6">

             {isOwner && currentHousehold && currentHousehold.leaveRequests && currentHousehold.leaveRequests.length > 0 && (
                 <>
                 <Separator />
                 <h3 className="text-lg font-semibold">Leaving Members</h3>
                  <div className="grid gap-4">
                    {currentHousehold.leaveRequests.map(req => (
                         <div key={req.requestId} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-md border gap-3">
                             <div className="flex items-center gap-4">
                                <History className="h-8 w-8 text-muted-foreground" />
                                 <div>
                                    <p className="font-medium">{req.userName} has left and took {req.requestedItems.length} item(s).</p>
                                    <p className="text-sm text-muted-foreground">Review to update inventory.</p>
                                 </div>
                             </div>
                              <Button size="sm" variant="outline" onClick={() => setReviewRequest(req)}>Review</Button>
                         </div>
                    ))}
                  </div>
                 </>
             )}


            {isOwner && currentHousehold && currentHousehold.pendingMembers.length > 0 && (
                <>
                <Separator />
                <h3 className="text-lg font-semibold">Pending Requests</h3>
                <div className="grid gap-4">
                    {currentHousehold.pendingMembers.map(member => (
                        <div key={member.userId} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-md border gap-3">
                            <div className="flex items-center gap-4">
                                <Avatar>
                                    <AvatarImage src={`https://placehold.co/100x100.png`} alt={member.userName} data-ai-hint="person" />
                                    <AvatarFallback>{member.userName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium">{member.userName}</p>
                                    {member.wantsToMergeInventory && (
                                        <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                                            <GitMerge className="h-4 w-4" />
                                            Wants to merge inventory
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2 self-end sm:self-center">
                                {member.wantsToMergeInventory ? (
                                    <>
                                     <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700" onClick={() => handleBeginApproveAndMerge(member.userId, member.userName)} disabled={!!isProcessingRequest}>
                                        {isProcessingRequest === member.userId ? <Loader2 className="h-4 w-4 animate-spin"/> : <><GitMerge className="h-4 w-4 mr-2" />Approve & Merge</>}
                                    </Button>
                                    <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700" onClick={() => onApprove(member.userId)} disabled={!!isProcessingRequest}>
                                        {isProcessingRequest === member.userId ? <Loader2 className="h-4 w-4 animate-spin"/> : <><Check className="h-4 w-4 mr-2" />Approve Only</>}
                                    </Button>
                                    </>
                                ) : (
                                    <Button size="icon" variant="outline" className="text-green-600 hover:text-green-700" onClick={() => onApprove(member.userId)} disabled={!!isProcessingRequest}>
                                        {isProcessingRequest === member.userId ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4" />}
                                    </Button>
                                )}
                                <Button size="icon" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => onReject(member.userId)} disabled={!!isProcessingRequest}>
                                    {isProcessingRequest === member.userId ? <Loader2 className="h-4 w-4 animate-spin"/> : <X className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
                </>
            )}

            <Separator />
            <h3 className="text-lg font-semibold">Active Members</h3>
                <div className="grid gap-4">
                {currentHousehold?.activeMembers.map(member => (
                    <div key={member.userId} className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Avatar>
                                <AvatarImage src={`https://placehold.co/100x100.png`} alt={member.userName} data-ai-hint="person" />
                                <AvatarFallback>{member.userName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <p className="font-medium">
                                {member.userName}
                                {member.userId === user?.uid && <span className="text-muted-foreground text-sm ml-2">(You)</span>}
                                {member.userId === currentHousehold.ownerId && <span className="text-muted-foreground text-sm ml-2">(Owner)</span>}
                            </p>
                        </div>
                    </div>
                ))}
                </div>
            <Separator />
            <Button variant="destructive" onClick={() => setIsLeaveAlertOpen(true)}>
                <LogOut className="mr-2 h-4 w-4" />
                Leave Household
            </Button>
            </CardContent>
        </Card>
    );

    const LeaveHouseholdDialogContent = () => {
        if (isOwner) {
            if (otherMembers.length > 0) {
                // Owner leaving with other members present
                return (
                    <>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Transfer Ownership Before Leaving</AlertDialogTitle>
                        <AlertDialogDescription>
                            You are the owner of this household. To leave, you must transfer ownership to another member.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                        <Label htmlFor="new-owner">Select a new owner:</Label>
                        <Select value={newOwnerId} onValueChange={setNewOwnerId}>
                            <SelectTrigger id="new-owner">
                                <SelectValue placeholder="Choose a member..." />
                            </SelectTrigger>
                            <SelectContent>
                                {otherMembers.map(member => (
                                    <SelectItem key={member.userId} value={member.userId}>{member.userName}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBeginLeave} disabled={!newOwnerId} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                            Next
                        </AlertDialogAction>
                    </AlertDialogFooter>
                    </>
                );
            } else {
                // Owner leaving as the last member
                    return (
                    <>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You are the last member. Leaving will dissolve the household and permanently delete all its shared data. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBeginLeave} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                            Yes, Leave and Dissolve
                        </AlertDialogAction>
                    </AlertDialogFooter>
                    </>
                );
            }
        } else {
            // Non-owner leaving
                return (
                <>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Leaving the household means you will lose access to all shared items and recipes. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBeginLeave} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                        Yes, Leave Household
                    </AlertDialogAction>
                </AlertDialogFooter>
                </>
            );
        }
    }


    return (
    <MainLayout>
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
            <div>
            <h1 className="text-3xl font-bold tracking-tight">Household</h1>
            <p className="text-muted-foreground">
                {isLoading ? "Loading your household info..." : currentHousehold ? "Manage your shared household" : "Join or create a household to get started."}
            </p>
            </div>
        </div>

        {isLoading ? <LoadingSkeleton /> : currentHousehold ? <InHouseholdView /> : <NoHouseholdView 
            onTriggerCreateConfirmation={() => setIsCreateConfirmOpen(true)}
            onTriggerJoinConfirmation={() => handleTriggerJoin()}
            isCreating={isCreating}
            isJoining={isJoining}
            joinCode={joinCode}
            setJoinCode={setJoinCode}
        />}

        </div>
        
        {/* === DIALOGS === */}

        <AlertDialog open={isLeaveAlertOpen} onOpenChange={setIsLeaveAlertOpen}>
            <AlertDialogContent>
                <LeaveHouseholdDialogContent />
            </AlertDialogContent>
        </AlertDialog>

        <TakeItemsDialog 
            isOpen={leaveStep === 'take_items'}
            setIsOpen={(isOpen) => !isOpen && setLeaveStep('initial')}
            inventory={allInventory.sharedItems}
            onConfirm={handleItemsToTakeConfirmed}
        />

        <RemapLeavingItemsDialog
            isOpen={leaveStep === 'remap_items'}
            setIsOpen={(isOpen) => !isOpen && setLeaveStep('initial')}
            itemsToRemap={itemsToRemap}
            personalLocations={userLocations}
            onConfirm={onLeaveHousehold}
        />

        <ApproveMergeDialog
            isOpen={approveMergeStep === 'confirm_merge'}
            setIsOpen={(isOpen) => !isOpen && setApproveMergeStep('initial')}
            itemsToMerge={inventoryToMerge}
            onConfirm={onApproveAndMerge}
        />

        {reviewRequest && (
            <ReviewLeaveRequestDialog
                isOpen={!!reviewRequest}
                setIsOpen={() => setReviewRequest(null)}
                request={reviewRequest}
                onProcess={handleProcessLeaveRequest}
            />
        )}
        
        {householdToJoin && (
            <MapLocationsDialog
                isOpen={isMapLocationsOpen}
                setIsOpen={setIsMapLocationsOpen}
                userInventory={allInventory.privateItems}
                userLocations={userLocations}
                householdLocations={householdToJoin.locations || []}
                onConfirm={(mapping) => {
                    onJoinHousehold(true, mapping);
                }}
            />
        )}


        <AlertDialog open={isCreateConfirmOpen} onOpenChange={setIsCreateConfirmOpen}>
             <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Create a Shared Household?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Your current inventory items will remain private. Your current storage locations will become the household's locations. Are you ready to proceed?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onCreateHousehold}>
                        Create Household
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    </MainLayout>
    );
}
