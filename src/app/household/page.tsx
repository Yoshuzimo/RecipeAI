import MainLayout from "@/components/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, Settings } from "lucide-react";

// Mock data for now
const householdMembers = [
  { id: "user1", name: "Alex (You)", avatar: "/avatars/01.png" },
  { id: "user2", name: "Jordan", avatar: "/avatars/02.png" },
  { id: "user3", name: "Taylor", avatar: "/avatars/03.png" },
];

export default function HouseholdPage() {
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
            <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Manage Household
            </Button>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Member
            </Button>
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
    </MainLayout>
  );
}
