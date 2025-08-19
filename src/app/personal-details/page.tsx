
import MainLayout from "@/components/main-layout";
import { PersonalDetailsForm } from "@/components/personal-details-form";
import { Separator } from "@/components/ui/separator";

export const dynamic = 'force-dynamic';

export default function PersonalDetailsPage() {
  return (
    <MainLayout>
      <div className="space-y-6 p-4 md:p-10 pb-16">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-bold tracking-tight">Personal Details</h2>
          <p className="text-muted-foreground">
            Manage your personal information, health goals, and dietary needs.
          </p>
        </div>
        <Separator />
        <PersonalDetailsForm />
      </div>
    </MainLayout>
  );
}
