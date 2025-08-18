
"use client";

import * as React from "react";
import MainLayout from "@/components/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, LogOut, Users, Copy, Check, X, Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { handleCreateHousehold, handleJoinHousehold, handleLeaveHousehold, handleApproveMember, handleRejectMember } from "./actions";
import { Separator } from "@/components/ui/separator";
import type { Household, HouseholdMember } from "@/lib/types";
import { useAuth } from "@/components/auth-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


// This is a placeholder, in a real app this would come from a server call
// along with the user's own data to determine if they are in a household.
const MOCK_CURRENT_HOUSEHOLD: Household | null = null;


export default function HouseholdPage() {
    const { user } = useAuth();
    const [isLeaveAlertOpen, setIsLeaveAlertOpen] = React.useState(false);
    const [isCreating, setIsCreating] = React.useState(false);
    const [isJoining, setIsJoining] = React.useState(false);
    const [isProcessingRequest, setIsProcessingRequest] = React.useState<string | null>(null);
    const [joinCode, setJoinCode] = React.useState("");
    const [currentHousehold, setCurrentHousehold] = React.useState<Household | null>(MOCK_CURRENT_HOUSEHOLD);
    const [newOwnerId, setNewOwnerId] = React.useState<string>("");
    const { toast } = useToast();
    
    const isOwner = user?.uid === currentHousehold?.ownerId;
    const otherMembers = currentHousehold?.activeMembers.filter(m => m.userId !== user?.uid) || [];


    const onCreateHousehold = async () => {
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

    const onJoinHousehold = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsJoining(true);
        const result = await handleJoinHousehold(joinCode.toUpperCase());
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
    
    const onLeaveHousehold = async () => {
        if (isOwner && otherMembers.length > 0 && !newOwnerId) {
            toast({ variant: "destructive", title: "New Owner Required", description: "You must select a new owner before leaving."});
            return;
        }

        const result = await handleLeaveHousehold(newOwnerId || undefined);
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
    
    const NoHouseholdView = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>Create a Household</CardTitle>
                    <CardDescription>Start a new household and invite your family or roommates to join.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={onCreateHousehold} disabled={isCreating} className="w-full">
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
                   <form onSubmit={onJoinHousehold} className="flex items-center gap-2">
                        <Input 
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value)}
                            placeholder="Enter 4-digit code"
                            maxLength={4}
                            className="uppercase tracking-widest font-mono"
                        />
                        <Button type="submit" disabled={isJoining || joinCode.length < 4}>
                            {isJoining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Join
                        </Button>
                   </form>
                </CardContent>
            </Card>
        </div>
    );
    
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
            {isOwner && currentHousehold && currentHousehold.pendingMembers.length > 0 && (
                <>
                <Separator />
                <h3 className="text-lg font-semibold">Pending Requests</h3>
                <div className="grid gap-4">
                    {currentHousehold.pendingMembers.map(member => (
                        <div key={member.userId} className="flex items-center justify-between p-2 rounded-md border">
                            <div className="flex items-center gap-4">
                                <Avatar>
                                    <AvatarImage src={`https://placehold.co/100x100.png`} alt={member.userName} data-ai-hint="person" />
                                    <AvatarFallback>{member.userName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <p className="font-medium">{member.userName}</p>
                            </div>
                            <div className="flex gap-2">
                                <Button size="icon" variant="outline" className="text-green-600 hover:text-green-700" onClick={() => onApprove(member.userId)} disabled={!!isProcessingRequest}>
                                    {isProcessingRequest === member.userId ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4" />}
                                </Button>
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
                        <AlertDialogAction onClick={onLeaveHousehold} disabled={!newOwnerId} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                            Leave and Transfer Ownership
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
                           You are the last member. Leaving will dissolve the household. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={onLeaveHousehold} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
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
                    <AlertDialogAction onClick={onLeaveHousehold} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
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
              {currentHousehold ? "Manage your shared household" : "Join or create a household to get started."}
            </p>
          </div>
        </div>

        {currentHousehold ? <InHouseholdView /> : <NoHouseholdView />}

      </div>
      <AlertDialog open={isLeaveAlertOpen} onOpenChange={setIsLeaveAlertOpen}>
          <AlertDialogContent>
              <LeaveHouseholdDialogContent />
          </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
