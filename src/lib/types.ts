

export type Unit = 'g' | 'kg' | 'ml' | 'l' | 'pcs' | 'oz' | 'lbs' | 'fl oz' | 'gallon';

export type StorageLocation = {
  id: string;
  name: string;
  type: 'Fridge' | 'Freezer' | 'Pantry';
};

export type InventoryItem = {
  id: string;
  name: string;
  // The original size of the package when it was full
  originalQuantity: number; 
  // The current remaining quantity in the package
  totalQuantity: number; 
  unit: Unit;
  expiryDate: Date | null;
  locationId: string;
};

// This group is for displaying items in the main inventory table.
// It groups all packages of the same item (e.g., "Chicken Breast") together.
export type InventoryItemGroup = {
  name: string;
  // A friendly string describing the packages, e.g., "1 x 1lb (100%), 1 x 1.5lb (50%)"
  packageInfo: string; 
  // All individual inventory items (packages) for this group.
  items: InventoryItem[];
  // The expiry date of the package that will expire first.
  nextExpiry: Date | null;
  // The unit of measurement. All items in the group share the same unit.
  unit: Unit; 
}

// This group is for the new edit/view dialog.
// It groups packages of the same item by their size.
export type InventoryPackageGroup = {
    size: number;
    fullPackages: InventoryItem[];
    partialPackage: InventoryItem | null;
}

export type GroupedByLocation = {
  [key in StorageLocation['type']]: InventoryItemGroup[];
};

export type PersonalDetails = {
  healthGoals?: string;
  dietaryRestrictions?: string;
  allergies?: string;
  favoriteFoods?: string;
  dislikedFoods?: string;
  healthConditions?: string;
  medications?: string;
  specializedEquipment?: string;
}

export type Settings = {
    unitSystem: "us" | "metric";
    aiFeatures: boolean;
    e2eEncryption: boolean;
    expiryNotifications: boolean;
}

export type Macros = {
    protein: number;
    carbs: number;
    fat: number;
};

export type RecipeIngredient = {
    name: string;
    notes?: string; // e.g., "chopped", "to taste", "about 1 cup"
}

export type Recipe = {
    title: string;
    description: string;
    servings: number;
    ingredients: string[]; // Keep original strings for display
    parsedIngredients: RecipeIngredient[]; // Parsed ingredients for AI processing
    instructions: string[];
    macros: Macros;
};

export type Substitution = {
    originalIngredient: string;
    suggestedSubstitutions: string[];
};

export type LoggedDish = {
    name: string;
} & Macros;

export type DailyMacros = {
    id: string; // Unique ID for each meal log entry
    meal: "Breakfast" | "Lunch" | "Dinner" | "Snack";
    dishes: LoggedDish[];
    totals: Macros;
    loggedAt: Date;
};

export type LeftoverDestination = {
    locationId: string;
    servings: number;
};

export type MoveRequest = {
    [size: number]: {
        fullPackagesToMove: number;
        partialAmountToMove: number;
        source: InventoryPackageGroup & { items: InventoryItem[] };
    }
}

export type SpoilageRequest = {
    [size: number]: {
        fullPackagesToSpoil: number;
        partialAmountToSpoil: number;
        source: InventoryPackageGroup;
    }
}
