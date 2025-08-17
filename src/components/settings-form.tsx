"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export function SettingsForm() {
  const { toast } = useToast();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated.",
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>
            Customize your experience with RecipeAI.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="ai-features" className="text-base">
                Enable AI Features
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow AI to generate meal and shopping suggestions.
              </p>
            </div>
            <Switch id="ai-features" defaultChecked />
          </div>
          <div className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="e2e-encryption" className="text-base">
                End-to-End Encryption
              </Label>
              <p className="text-sm text-muted-foreground">
                Secure your sensitive health data. (UI only)
              </p>
            </div>
            <Switch id="e2e-encryption" />
          </div>
          <div className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="notifications" className="text-base">
                Expiry Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Get alerts for items that are about to expire.
              </p>
            </div>
            <Switch id="notifications" defaultChecked />
          </div>
        </CardContent>
      </Card>
      <div className="mt-6 flex justify-end">
        <Button type="submit">Save Changes</Button>
      </div>
    </form>
  );
}
