
"use client";

import * as React from "react";
import MainLayout from "@/components/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, LogOut, Users, Copy } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { handleCreateHousehold, handleJoinHousehold, handleLeaveHousehold } from "./actions";
import { Separator } from "@/components/ui/separator";
import type { Household } from "@/lib/types";

// This is a placeholder, in a real app this would come from a server call
// along with the user's own data to determine if they are in a household.
const MOCK_CURRENT_HOUSEHOLD: Household | null = null;
const MOCK_MEMBERS = [
    { id: "1", name: "Alex (You)", avatarUrl: "https://placehold.co/100x100.png" },
    { id: "2", name: "Beth", avatarUrl: "https://placehold.co/100x100.png" },
]


export default function HouseholdPage() {
    const [isLeaveAlertOpen, setIsLeaveAlertOpen] = React.useState(false);
    const [isCreating, setIsCreating] = React.useState(false);
    const [isJoining, setIsJoining] = React.useState(false);
    const [joinCode, setJoinCode] = React.useState("");
    const [currentHousehold, setCurrentHousehold] = React.useState<Household | null>(MOCK_CURRENT_HOUSEHOLD);
    const { toast } = useToast();

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

        if (result.success && result.household) {
            toast({
                title: "Joined Household!",
                description: `You are now a member of ${result.household.inviteCode}.`,
            });
             setCurrentHousehold(result.household);
        } else {
            toast({
                variant: "destructive",
                title: "Failed to Join",
                description: result.error,
            });
        }
    };
    
    const onLeaveHousehold = async () => {
        const result = await handleLeaveHousehold();
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
    }
    
    const copyInviteCode = () => {
        if (currentHousehold?.inviteCode) {
            navigator.clipboard.writeText(currentHousehold.inviteCode);
            toast({ title: "Copied!", description: "Invite code copied to clipboard." });
        }
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
                            placeholder="Enter 6-digit code"
                            maxLength={6}
                            className="uppercase"
                        />
                        <Button type="submit" disabled={isJoining || joinCode.length < 6}>
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
            <Separator />
            <h3 className="text-lg font-semibold">Members</h3>
             <div className="grid gap-4">
                {MOCK_MEMBERS.map(member => (
                    <div key={member.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Avatar>
                                <AvatarImage src={member.avatarUrl} alt={member.name} data-ai-hint="person" />
                                <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <p className="font-medium">{member.name}</p>
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
          </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
