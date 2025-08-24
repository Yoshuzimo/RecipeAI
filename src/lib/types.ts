

export type Unit = 'g' | 'kg' | 'ml' | 'l' | 'pcs' | 'oz' | 'lbs' | 'fl oz' | 'gallon';

export type StorageLocation = {
  id: string;
  name: string;
  type: 'Fridge' | 'Freezer' | 'Pantry';
};

export type Macros = {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
};

export type InventoryItem = {
  id: string;
  name: string;
  originalQuantity: number; 
  totalQuantity: number; 
  unit: Unit;
  expiryDate: Date | null;
  locationId: string;
  isPrivate: boolean;
  restockThreshold?: number;
  macros?: Macros; // Normalized per 100g or 100ml for AI
  servingSize?: { quantity: number; unit: Unit }; // User-entered serving size
  servingMacros?: Macros; // User-entered macros for that serving size
};

// Type for adding a new item, with an optional flag for privacy
export type NewInventoryItem = Omit<InventoryItem, 'id'>;

export type InventoryItemGroup = {
  name: string;
  packageInfo: string; 
  items: InventoryItem[];
  nextExpiry: Date | null;
  unit: Unit; 
  isPrivate: boolean;
  locationId: string;
  locationName: string;
}

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
    displayName: string;
    unitSystem: "us" | "metric";
    subscriptionStatus: 'free' | 'premium';
    aiFeatures: boolean;
    e2eEncryption: boolean;
    expiryNotifications: boolean;
    calorieGoal?: number;
    proteinGoal?: number;
    carbsGoal?: number;
    fatGoal?: number;
    dayStartTime?: string;
}

export type RecipeIngredient = {
    name: string;
    notes?: string; // e.g., "chopped", "to taste", "about 1 cup"
}

export type Recipe = {
    title: string;
    description: string;
    servings: number;
    ingredients: string[];
    instructions: string[];
    macros: Macros;
    isPrivate?: boolean;
    ownerName?: string;
    householdId?: string | null;
};

export type AISuggestion = {
    name: string;
    note: string;
}

export type Substitution = {
    originalIngredient: string;
    suggestedSubstitutions: AISuggestion[];
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

// For mapping user's items to new household locations
export type ItemMigrationMapping = {
  [itemId: string]: {
    newLocationId: string;
    keepPrivate: boolean;
  };
};


// Represents a household member for UI purposes
export type HouseholdMember = {
  userId: string;
  userName: string;
  wantsToMergeInventory?: boolean;
  itemMigrationMapping?: ItemMigrationMapping;
};


export type RequestedItem = {
    name: string;
    quantity: number;
    unit: Unit;
    originalItemId: string; 
};

export type LeaveRequest = {
    requestId: string;
    userId: string;
    userName: string;
    requestedItems: RequestedItem[];
    status: 'pending_review' | 'completed';
};

export type PendingMeal = {
  id: string;
  recipe: Recipe;
  cookId: string;
  cookName: string;
  pendingUserIds: string[]; // IDs of users who still need to respond
  createdAt: Date;
}

export type Household = {
    id: string;
    inviteCode: string;
    ownerId: string;
    ownerName: string;
    activeMembers: HouseholdMember[]; 
    pendingMembers: HouseholdMember[];
    leaveRequests?: LeaveRequest[];
    pendingMeals?: PendingMeal[];
    locations: StorageLocation[];
    sharedInventory?: InventoryItem[]; // Adding for easier access in UI
};


// Request to mark certain packages as private to a user
export type MarkPrivateRequest = {
  ownerId: string;
  ownerName: string;
  packages: {
    itemId: string; // ID of the package to update
    isPartial: boolean;
    amount?: number; // Only for partial packages, the amount to make private
  }[];
}

export type ShoppingListItem = {
    id: string;
    item: string;
    quantity: string;
    reason?: string;
    checked: boolean;
    addedAt: Date;
};

export type AIShoppingSuggestion = {
    item: string;
    quantity: string;
    reason: string;
}
