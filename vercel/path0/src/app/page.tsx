
import MainLayout from "@/components/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getClientInventory, getTodaysMacros, getSettings } from "@/app/actions";
import { differenceInDays } from "date-fns";
import { CookingPot, Package, AlarmClock, TrendingUp } from 'lucide-react';
import { TodaysMacros } from "@/components/todays-macros";
import type { DailyMacros, Settings, InventoryItem } from "@/lib/types";

export const dynamic = 'force-dynamic';

export default async function OverviewPage() {
  const { privateItems, sharedItems }: { privateItems: InventoryItem[], sharedItems: InventoryItem[] } = await getClientInventory();
  const dailyData: DailyMacros[] = await getTodaysMacros();
  const settings: Settings | null = await getSettings();

  const inventory = [...privateItems, ...sharedItems];

  const now = new Date();
  const expiringSoon = inventory.filter(item => {
    if (!item.expiryDate) return false;
    const days = differenceInDays(item.expiryDate, now);
    return days >= 0 && days <= 3;
  }).length;

  const expired = inventory.filter(item => {
    if (!item.expiryDate) return false;
    return differenceInDays(item.expiryDate, now) < 0
  }).length;
  
  const totals = dailyData.reduce((acc, meal) => {
    const calories = (meal.totals.protein * 4) + (meal.totals.carbs * 4) + (meal.totals.fat * 9);
    acc.calories += calories;
    acc.protein += meal.totals.protein;
    acc.carbs += meal.totals.carbs;
    acc.fat += meal.totals.fat;
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  return (
    <MainLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <TodaysMacros dailyData={dailyData} settings={settings} totals={totals} onDataChange={async () => {}} />
        <p className="text-sm text-muted-foreground pt-2">
            Disclaimer: The information on this page is based on available data and is approximate. It should be used as a guide only and not as a replacement for professional advice.
        </p>
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
