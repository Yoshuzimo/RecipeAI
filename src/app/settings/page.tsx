
import MainLayout from "@/components/main-layout";
import { SettingsForm } from "@/components/settings-form";
import { Separator } from "@/components/ui/separator";

export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  return (
    <MainLayout>
      <div className="space-y-6 p-4 md:p-10 pb-16 max-w-[108rem] mx-auto">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">
            Manage your account settings, preferences, and storage locations.
          </p>
        </div>
        <Separator />
        <SettingsForm />
      </div>
    </MainLayout>
  );
}
