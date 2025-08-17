import MainLayout from "@/components/main-layout";
import { SavedRecipes } from "@/components/saved-recipes";

export default function SavedRecipesPage() {
  return (
    <MainLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <SavedRecipes />
      </div>
    </MainLayout>
  );
}
