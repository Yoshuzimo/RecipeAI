
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
import { useEffect, useState } from "react";
import { getSettings, saveSettings } from "@/lib/data";
import type { Settings } from "@/lib/types";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

export function SettingsForm() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings>({
    unitSystem: "us",
    aiFeatures: true,
    e2eEncryption: true,
    expiryNotifications: true,
  });
  
  useEffect(() => {
    async function loadSettings() {
      const savedSettings = await getSettings();
      setSettings(savedSettings);
    }
    loadSettings();
  }, []);

  const handleSettingChange = (key: keyof Settings, value: any) => {
    setSettings(prev => ({...prev, [key]: value}));
  };
  
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await saveSettings(settings);
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated.",
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Unit System</CardTitle>
            <CardDescription>
              Choose the unit system for measurements throughout the app.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={settings.unitSystem}
              onValueChange={(value) => handleSettingChange("unitSystem", value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="us" id="us" />
                <Label htmlFor="us">US (Imperial - lbs, oz)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="metric" id="metric" />
                <Label htmlFor="metric">Metric (kg, g)</Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
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
              <Switch 
                id="ai-features" 
                checked={settings.aiFeatures}
                onCheckedChange={(checked) => handleSettingChange("aiFeatures", checked)}
              />
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
              <Switch 
                id="notifications" 
                checked={settings.expiryNotifications}
                onCheckedChange={(checked) => handleSettingChange("expiryNotifications", checked)}
               />
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="mt-6 flex justify-end">
        <Button type="submit">Save Changes</Button>
      </div>
    </form>
  );
}
