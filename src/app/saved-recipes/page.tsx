

import MainLayout from "@/components/main-layout";
import { SavedRecipes } from "@/components/saved-recipes";
import { getClientSavedRecipes, getClientHouseholdRecipes } from "@/app/actions";

export const dynamic = 'force-dynamic';

export default async function SavedRecipesPage() {
  const savedRecipes = await getClientSavedRecipes();
  const householdRecipes = await getClientHouseholdRecipes();

  return (
    <MainLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <SavedRecipes 
            initialRecipes={savedRecipes} 
            initialHouseholdRecipes={householdRecipes}
        />
      </div>
    </MainLayout>
  );
}
