import MainLayout from "@/components/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getInventory } from "@/lib/data";
import { differenceInDays } from "date-fns";
import { CookingPot, Package, AlarmClock, TrendingUp } from 'lucide-react';

export default async function OverviewPage() {
  const inventory = await getInventory();

  const now = new Date();
  const expiringSoon = inventory.filter(item => {
    const days = differenceInDays(item.expiryDate, now);
    return days >= 0 && days <= 3;
  }).length;

  const expired = inventory.filter(item => differenceInDays(item.expiryDate, now) < 0).length;

  return (
    <MainLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Inventory Items
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inventory.length}</div>
              <p className="text-xs text-muted-foreground">
                Different types of items
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Expiring Soon
              </CardTitle>
              <AlarmClock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{expiringSoon}</div>
              <p className="text-xs text-muted-foreground">
                Items expiring in the next 3 days
              </p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Expired Items
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{expired}</div>
               <p className="text-xs text-muted-foreground">
                Check your inventory for expired items
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Meal Plan Activity
              </CardTitle>
              <CookingPot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+5</div>
              <p className="text-xs text-muted-foreground">
                New meal suggestions this week
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
