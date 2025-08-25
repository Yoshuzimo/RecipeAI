
import MainLayout from "@/components/main-layout";
import { MealHistoryClient } from "@/components/meal-history-client";
import { getAllMacros } from "@/app/actions";

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
    const allMeals = await getAllMacros();
    
    return (
        <MainLayout>
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <MealHistoryClient initialMeals={allMeals} />
            </div>
        </MainLayout>
    );
}
