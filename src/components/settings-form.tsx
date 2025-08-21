
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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { getSettings, saveSettings, getClientStorageLocations, getClientHousehold } from "@/app/actions";
import type { Settings, StorageLocation, Household } from "@/lib/types";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { PlusCircle, Pencil } from "lucide-react";
import { AddStorageLocationDialog } from "./add-storage-location-dialog";
import { EditStorageLocationDialog } from "./edit-storage-location-dialog";
import { Loader2 } from "lucide-react";

export function SettingsForm() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);
  const [editLocation, setEditLocation] = useState<StorageLocation | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [household, setHousehold] = useState<Household | null>(null);
  
  useEffect(() => {
    async function loadData() {
      const savedSettings = await getSettings();
      setSettings(savedSettings);
      const locations = await getClientStorageLocations();
      setStorageLocations(locations);
      const householdData = await getClientHousehold();
      setHousehold(householdData);
    }
    loadData();
  }, []);

  const handleSettingChange = (key: keyof Settings, value: any) => {
    setSettings(prev => (prev ? {...prev, [key]: value} : null));
  };
  
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!settings) return;
    
    setIsSaving(true);
    await saveSettings(settings);
    setIsSaving(false);
    
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated.",
    });
  };

  const onLocationAdded = (newLocation: StorageLocation) => {
    setStorageLocations(prev => [...prev, newLocation]);
  }

  const onLocationUpdated = (updatedLocation: StorageLocation) => {
    setStorageLocations(prev => prev.map(l => l.id === updatedLocation.id ? updatedLocation : l));
  }

  const onLocationRemoved = (locationId: string) => {
    setStorageLocations(prev => prev.filter(l => l.id !== locationId));
  }
  
  if (!settings) {
      return (
          <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin" />
          </div>
      )
  }


  return (
    <>
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Account</CardTitle>
                <CardDescription>Update your public profile information.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input 
                        id="displayName" 
                        value={settings.displayName || ""} 
                        onChange={(e) => handleSettingChange('displayName', e.target.value)}
                        placeholder="e.g., Alex"
                    />
                    <p className="text-sm text-muted-foreground">
                        This name will be visible to members of your household.
                    </p>
                </div>
            </CardContent>
        </Card>

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
                 <CardTitle>Storage Locations</CardTitle>
                <CardDescription>
                    {household ? "Manage your household's fridges, freezers, and pantries." : "Manage your personal fridges, freezers, and pantries."}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    {storageLocations.map(location => (
                        <div key={location.id} className="flex items-center justify-between rounded-lg border p-4">
                            <div>
                                <p className="font-medium">{location.name}</p>
                                <p className="text-sm text-muted-foreground">{location.type}</p>
                            </div>
                            <Button type="button" variant="ghost" size="icon" onClick={() => setEditLocation(location)}>
                                <Pencil className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
                <Button type="button" variant="outline" className="w-full" onClick={() => setIsAddLocationOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New Location
                </Button>
            </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>
              Customize your experience with CookSmart.
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
        <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
        </Button>
      </div>
    </form>
     <AddStorageLocationDialog 
        isOpen={isAddLocationOpen}
        setIsOpen={setIsAddLocationOpen}
        onLocationAdded={onLocationAdded}
     />
     {editLocation && (
        <EditStorageLocationDialog
            isOpen={!!editLocation}
            setIsOpen={(isOpen) => { if (!isOpen) setEditLocation(null) }}
            location={editLocation}
            onLocationUpdated={onLocationUpdated}
            onLocationRemoved={onLocationRemoved}
        />
     )}
    </>
  );
}