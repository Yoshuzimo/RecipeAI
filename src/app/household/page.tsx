
"use client";

import * as React from "react";
import MainLayout from "@/components/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, LogOut } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { handleInviteUser } from "./actions";

// Mock data for now
const householdMembers = [
  { id: "user1", name: "Alex (You)", avatar: "/avatars/01.png" },
  { id: "user2", name: "Jordan", avatar: "/avatars/02.png" },
  { id: "user3", name: "Taylor", avatar: "/avatars/03.png" },
];


export default function HouseholdPage() {
    const [isLeaveAlertOpen, setIsLeaveAlertOpen] = React.useState(false);
    const [isInviteDialogOpen, setIsInviteDialogOpen] = React.useState(false);
    const [inviteEmail, setInviteEmail] = React.useState("");
    const [isInviting, setIsInviting] = React.useState(false);
    const { toast } = useToast();

    const onInviteSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsInviting(true);
        const result = await handleInviteUser(inviteEmail);
        setIsInviting(false);

        if (result.success) {
            toast({
                title: "Invitation Sent!",
                description: `An invitation has been sent to ${inviteEmail}.`,
            });
            setIsInviteDialogOpen(false);
            setInviteEmail("");
        } else {
            toast({
                variant: "destructive",
                title: "Invitation Failed",
                description: result.error,
            });
        }
    };


  return (
    <MainLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Household</h1>
            <p className="text-muted-foreground">
              Manage your shared inventory, meals, and recipes with family.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={() => setIsLeaveAlertOpen(true)}>
                <LogOut className="mr-2 h-4 w-4" />
                Leave Household
            </Button>
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Invite Member
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <form onSubmit={onInviteSubmit}>
                        <DialogHeader>
                            <DialogTitle>Invite a new member</DialogTitle>
                            <DialogDescription>
                                Enter the email of the person you want to invite. They will receive a link to join your household.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="email" className="text-right">
                                    Email
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    className="col-span-3"
                                    placeholder="name@example.com"
                                    required
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={isInviting}>
                                {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Send Invitation
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>
              These are the members of your household.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            {householdMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between space-x-4">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage src={`https://i.pravatar.cc/150?u=${member.id}`} />
                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium leading-none">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.id === 'user1' ? 'Admin' : 'Member'}</p>
                  </div>
                </div>
                {member.id !== 'user1' && (
                    <Button variant="outline" size="sm">Remove</Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
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
                  <AlertDialogAction onClick={() => console.log("Leave household")}>
                      Yes, Leave Household
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
