
"use client";

import * as React from "react";
import MainLayout from "@/components/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Copy, Check, X, Loader2, GitMerge, Inbox, History, PackageCheck, PackageX } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getClientHousehold, handleCreateHousehold, handleJoinHousehold, handleLeaveHousehold, handleApproveMember, handleRejectMember, handleApproveAndMerge, getClientInventory, handleReviewLeaveRequest } from "@/app/actions";
import { Separator } from "@/components/ui/separator";
import type { Household, InventoryItem, RequestedItem, LeaveRequest } from "@/lib/types";
import { useAuth } from "@/components/auth-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";


export const dynamic = 'force-dynamic';

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

const TakeItemsDialog = ({ isOpen, setIsOpen, inventory, onConfirm }: {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    inventory: InventoryItem[];
    onConfirm: (items: RequestedItem[]) => void;
}) => {
    const [selectedItems, setSelectedItems] = React.useState<Record<string, number>>({});

    const handleConfirm = () => {
        const itemsToTake: RequestedItem[] = Object.entries(selectedItems).map(([id, quantity]) => {
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
                    <DialogDescription>Select any items and quantities you wish to take from the household inventory. These will be copied to your personal inventory.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-96 pr-4 my-4">
                    <div className="space-y-4">
                        {inventory.map(item => (
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
                                    value={selectedItems[item.id] || 0}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setSelectedItems(prev => ({ ...prev, [item.id]: isNaN(val) ? 0 : Math.max(0, Math.min(val, item.totalQuantity)) }))
                                    }}
                                    className="mt-2"
                                />
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleConfirm}>Confirm & Leave</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

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
    const [isJoinConfirmOpen, setIsJoinConfirmOpen] = React.useState(false);
    const [isJoinPrivateConfirmOpen, setIsJoinPrivateConfirmOpen] = React.useState(false);
    const [isLeaveAlertOpen, setIsLeaveAlertOpen] = React.useState(false);
    const [isTakeItemsOpen, setIsTakeItemsOpen] = React.useState(false);
    const [isCreating, setIsCreating] = React.useState(false);
    const [isJoining, setIsJoining] = React.useState(false);
    const [isProcessingRequest, setIsProcessingRequest] = React.useState<string | null>(null);
    const [joinCode, setJoinCode] = React.useState("");
    const [currentHousehold, setCurrentHousehold] = React.useState<Household | null>(null);
    const [householdInventory, setHouseholdInventory] = React.useState<InventoryItem[]>([]);
    const [newOwnerId, setNewOwnerId] = React.useState<string>("");
    const [reviewRequest, setReviewRequest] = React.useState<LeaveRequest | null>(null);

    const { toast } = useToast();
    
    const fetchHouseholdData = React.useCallback(async () => {
        if (user) {
            try {
                const household = await getClientHousehold();
                setCurrentHousehold(household);
                if (household) {
                    const inventory = await getClientInventory();
                    setHouseholdInventory(inventory);
                }
            } catch(e) {
                console.error("Failed to fetch household", e);
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

    const onJoinHousehold = async (mergeInventory: boolean) => {
        setIsJoining(true);
        const result = await handleJoinHousehold(joinCode.toUpperCase(), mergeInventory);
        setIsJoining(false);
        setIsJoinConfirmOpen(false);
        setIsJoinPrivateConfirmOpen(false);

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
    
    const onLeaveHousehold = async (itemsToTake: RequestedItem[]) => {
        if (isOwner && otherMembers.length > 0 && !newOwnerId) {
            toast({ variant: "destructive", title: "New Owner Required", description: "You must select a new owner before leaving."});
            return;
        }

        const result = await handleLeaveHousehold(itemsToTake, newOwnerId || undefined);
        if (result.success) {
            toast({
                title: "You have left the household."
            });
            setCurrentHousehold(null);
        } else {
                toast({
                variant: "destructive",
                title: "Failed to Leave",
                description: result.error,
            });
        }
        setIsLeaveAlertOpen(false);
        setNewOwnerId("");
    }
    
    const copyInviteCode = () => {
        if (currentHousehold?.inviteCode) {
            navigator.clipboard.writeText(currentHousehold.inviteCode);
            toast({ title: "Copied!", description: "Invite code copied to clipboard." });
        }
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
    
    const onApproveAndMerge = async (memberId: string) => {
        if (!currentHousehold) return;
        setIsProcessingRequest(memberId);
        const result = await handleApproveAndMerge(currentHousehold.id, memberId);
        if (result.success && result.household) {
            setCurrentHousehold(result.household);
            toast({ title: "Member Approved & Inventory Merged!" });
        } else {
            toast({ variant: "destructive", title: "Action Failed", description: result.error });
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
                                     <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700" onClick={() => onApproveAndMerge(member.userId)} disabled={!!isProcessingRequest}>
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
                        <AlertDialogAction onClick={() => { setIsLeaveAlertOpen(false); setIsTakeItemsOpen(true); }} disabled={!newOwnerId} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
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
                        <AlertDialogAction onClick={() => { setIsLeaveAlertOpen(false); setIsTakeItemsOpen(true); }} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
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
                        Leaving the household means you will lose access to all shared items and recipes. Any items you own will be un-shared. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => { setIsLeaveAlertOpen(false); setIsTakeItemsOpen(true); }} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
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
            onTriggerJoinConfirmation={() => setIsJoinConfirmOpen(true)}
            isCreating={isCreating}
            isJoining={isJoining}
            joinCode={joinCode}
            setJoinCode={setJoinCode}
        />}

        </div>
        <AlertDialog open={isLeaveAlertOpen} onOpenChange={setIsLeaveAlertOpen}>
            <AlertDialogContent>
                <LeaveHouseholdDialogContent />
            </AlertDialogContent>
        </AlertDialog>

        <TakeItemsDialog 
            isOpen={isTakeItemsOpen}
            setIsOpen={setIsTakeItemsOpen}
            inventory={householdInventory}
            onConfirm={(items) => {
                onLeaveHousehold(items);
                setIsTakeItemsOpen(false);
            }}
        />

        {reviewRequest && (
            <ReviewLeaveRequestDialog
                isOpen={!!reviewRequest}
                setIsOpen={() => setReviewRequest(null)}
                request={reviewRequest}
                onProcess={handleProcessLeaveRequest}
            />
        )}


        <AlertDialog open={isCreateConfirmOpen} onOpenChange={setIsCreateConfirmOpen}>
             <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Create a Shared Household?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Before creating a household, please ensure you have marked any personal food items as "Private" in your inventory.
                        Any items not marked as private will become visible to all household members. Are you ready to proceed?
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

        <AlertDialog open={isJoinConfirmOpen} onOpenChange={setIsJoinConfirmOpen}>
             <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Combine Inventories?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Would you like to combine your current inventory with this household? If you choose yes, your non-private items will be transferred to the household owner upon approval. You can keep your items separate if you prefer.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => { setIsJoinConfirmOpen(false); onJoinHousehold(false); }}>
                        No, Keep Separate
                    </AlertDialogAction>
                    <AlertDialogAction onClick={() => { setIsJoinConfirmOpen(false); setIsJoinPrivateConfirmOpen(true); }}>
                        Yes, Combine
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

         <AlertDialog open={isJoinPrivateConfirmOpen} onOpenChange={setIsJoinPrivateConfirmOpen}>
             <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Inventory Merge</AlertDialogTitle>
                    <AlertDialogDescription>
                        Have you marked all your personal food items as "Private"? Any items not marked as private will be transferred to the household owner upon approval. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onJoinHousehold(true)}>
                        Yes, I've Marked My Items
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    </MainLayout>
    );
}
