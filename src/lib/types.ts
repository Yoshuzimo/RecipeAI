
export type Unit = 'g' | 'kg' | 'ml' | 'l' | 'pcs' | 'oz' | 'lbs' | 'fl oz' | 'gallon';

export type InventoryItem = {
  id: string;
  name: string;
  packageSize: number;
  packageCount: number;
  unit: Unit;
  expiryDate: Date;
};

export type InventoryItemGroup = {
  name: string;
  items: InventoryItem[];
  totalQuantity: number;
  unit: Unit;
  nextExpiry: Date | null;
}

export type PersonalDetails = {
  healthGoals?: string;
  dietaryRestrictions?: string;
  allergies?: string;
  favoriteFoods?: string;
  dislikedFoods?: string;
  healthConditions?: string;
  medications?: string;
}

export type Settings = {
    unitSystem: "us" | "metric";
    aiFeatures: boolean;
    e2eEncryption: boolean;
    expiryNotifications: boolean;
}

export type Recipe = {
    title: string;
    description: string;
    servings: number;
    ingredients: string[];
    instructions: string[];
    macros: {
        protein: number;
        carbs: number;
        fat: number;
    };
};

export type Substitution = {
    originalIngredient: string;
    suggestedSubstitutions: string[];
};
