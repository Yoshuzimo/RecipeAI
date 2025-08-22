

import MainLayout from "@/components/main-layout";
import { SavedRecipes } from "@/components/saved-recipes";
import { getClientSavedRecipes } from "@/app/actions";

export const dynamic = 'force-dynamic';

export default async function SavedRecipesPage() {
  const savedRecipes = await getClientSavedRecipes();

  return (
    <MainLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <SavedRecipes initialRecipes={savedRecipes} />
      </div>
    </MainLayout>
  );
}
