



import { DailyMacros, InventoryItem, Macros, PersonalDetails, Settings, Unit, StorageLocation } from "./types";

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);
const yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1);
const nextWeek = new Date(today);
nextWeek.setDate(today.getDate() + 7);
const twoDaysFromNow = new Date(today);
twoDaysFromNow.setDate(today.getDate() + 2);
const threeDaysFromNow = new Date(today);
threeDaysFromNow.setDate(today.getDate() + 3);

let MOCK_STORAGE_LOCATIONS: StorageLocation[] = [
    { id: 'fridge-1', name: 'Main Fridge', type: 'Fridge' },
    { id: 'freezer-1', name: 'Main Freezer', type: 'Freezer' },
    { id: 'pantry-1', name: 'Pantry', type: 'Pantry' },
];

let MOCK_INVENTORY: InventoryItem[] = [
  { id: '1', name: 'Chicken Breast', packageSize: 1, packageCount: 1, unit: 'lbs', expiryDate: twoDaysFromNow, locationId: 'fridge-1' },
  { id: '1a', name: 'Chicken Breast', packageSize: 1.5, packageCount: 1, unit: 'lbs', expiryDate: nextWeek, locationId: 'freezer-1' },
  { id: '2', name: 'Broccoli', packageSize: 12, packageCount: 1, unit: 'oz', expiryDate: nextWeek, locationId: 'fridge-1' },
  { id: '3', name: 'Milk', packageSize: 1, packageCount: 1, unit: 'gallon', expiryDate: tomorrow, locationId: 'fridge-1' },
  { id: '4', name: 'Eggs', packageSize: 12, packageCount: 1, unit: 'pcs', expiryDate: nextWeek, locationId: 'fridge-1' },
  { id: '5', name: 'Tomatoes', packageSize: 1, packageCount: 5, unit: 'pcs', expiryDate: nextWeek, locationId: 'pantry-1' },
  { id: '6', name: 'Ground Beef', packageSize: 1, packageCount: 1, unit: 'lbs', expiryDate: yesterday, locationId: 'fridge-1' },
  { id: '6a', name: 'Ground Beef', packageSize: 1, packageCount: 1, unit: 'lbs', expiryDate: threeDaysFromNow, locationId: 'freezer-1' },
  { id: '7', name: 'Cheddar Cheese', packageSize: 8, packageCount: 1, unit: 'oz', expiryDate: nextWeek, locationId: 'fridge-1' },
  { id: '8', name: 'Lettuce', packageSize: 1, packageCount: 1, unit: 'pcs', expiryDate: twoDaysFromNow, locationId: 'fridge-1' },
];

let MOCK_PERSONAL_DETAILS: PersonalDetails = {
    healthGoals: "",
    dietaryRestrictions: "",
    allergies: "",
    favoriteFoods: "",
    dislikedFoods: "",
    healthConditions: "",
    medications: ""
};

let MOCK_SETTINGS: Settings = {
    unitSystem: 'us',
    aiFeatures: true,
    e2eEncryption: true,
    expiryNotifications: true,
};

let MOCK_TODAYS_MACROS: DailyMacros[] = [
    { 
        meal: "Breakfast", 
        dishes: [{name: "Omelette", protein: 30, carbs: 5, fat: 20}],
        totals: { protein: 30, carbs: 5, fat: 20 }
    },
    { 
        meal: "Snack", 
        dishes: [{name: "Protein Shake", protein: 15, carbs: 25, fat: 10}],
        totals: { protein: 15, carbs: 25, fat: 10 }
    },
];


// Simulate client-side local storage
const mockLocalStorage = new Map<string, string>();

export async function getStorageLocations(): Promise<StorageLocation[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return MOCK_STORAGE_LOCATIONS;
}

export async function addStorageLocation(location: Omit<StorageLocation, 'id'>): Promise<StorageLocation> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const newLocation = { ...location, id: Math.random().toString(36).substring(2, 9) };
    MOCK_STORAGE_LOCATIONS.push(newLocation);
    return newLocation;
}

export async function updateStorageLocation(location: StorageLocation): Promise<StorageLocation> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const index = MOCK_STORAGE_LOCATIONS.findIndex(l => l.id === location.id);
    if (index === -1) throw new Error("Location not found");
    MOCK_STORAGE_LOCATIONS[index] = location;
    return location;
}

export async function removeStorageLocation(locationId: string): Promise<{id: string}> {
    await new Promise(resolve => setTimeout(resolve, 500));
    // In a real app, we'd want to handle what happens to items in this location.
    // For this demo, we'll prevent deletion if items exist.
    const itemsInLocation = MOCK_INVENTORY.filter(item => item.locationId === locationId);
    if (itemsInLocation.length > 0) {
        throw new Error("Cannot remove a location that contains inventory items.");
    }
    const index = MOCK_STORAGE_LOCATIONS.findIndex(l => l.id === locationId);
    if (index === -1) throw new Error("Location not found");
    MOCK_STORAGE_LOCATIONS.splice(index, 1);
    return { id: locationId };
}


export async function getInventory(): Promise<InventoryItem[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return MOCK_INVENTORY;
}

export async function addInventoryItem(item: Omit<InventoryItem, 'id'>): Promise<InventoryItem> {
  await new Promise(resolve => setTimeout(resolve, 500));
  const newItem = { ...item, id: Math.random().toString(36).substring(2, 9) };
  MOCK_INVENTORY.push(newItem);
  return newItem;
}

export async function updateInventoryItem(updatedItem: InventoryItem): Promise<InventoryItem> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const index = MOCK_INVENTORY.findIndex(item => item.id === updatedItem.id);
    if (index === -1) {
        throw new Error("Item not found");
    }
    MOCK_INVENTORY[index] = updatedItem;
    return updatedItem;
}

export async function removeInventoryItem(itemId: string): Promise<{ id: string }> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const index = MOCK_INVENTORY.findIndex(item => item.id === itemId);
    if (index === -1) {
        throw new Error("Item not found");
    }
    MOCK_INVENTORY.splice(index, 1);
    return { id: itemId };
}

export async function getPersonalDetails(): Promise<PersonalDetails> {
    await new Promise(resolve => setTimeout(resolve, 100));
    const details = mockLocalStorage.get('personalDetails');
    return details ? JSON.parse(details) : MOCK_PERSONAL_DETAILS;
}

export async function savePersonalDetails(details: PersonalDetails): Promise<PersonalDetails> {
    await new Promise(resolve => setTimeout(resolve, 100));
    MOCK_PERSONAL_DETAILS = details;
    mockLocalStorage.set('personalDetails', JSON.stringify(details));
    return MOCK_PERSONAL_DETAILS;
}

export async function getSettings(): Promise<Settings> {
    await new Promise(resolve => setTimeout(resolve, 100));
    const settings = mockLocalStorage.get('settings');
    return settings ? JSON.parse(settings) : MOCK_SETTINGS;
}

export async function saveSettings(settings: Settings): Promise<Settings> {
    await new Promise(resolve => setTimeout(resolve, 100));
    MOCK_SETTINGS = settings;
    mockLocalStorage.set('settings', JSON.stringify(settings));
    return MOCK_SETTINGS;
}

export async function getUnitSystem(): Promise<'us' | 'metric'> {
    const settings = await getSettings();
    return settings.unitSystem;
}

export async function getTodaysMacros(): Promise<DailyMacros[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return MOCK_TODAYS_MACROS;
}

export async function logMacros(mealType: "Breakfast" | "Lunch" | "Dinner" | "Snack", dishName: string, macros: Macros): Promise<DailyMacros> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    let mealLog = MOCK_TODAYS_MACROS.find(m => m.meal === mealType);
    
    if (mealLog) {
        // Meal type exists, add dish and update totals
        mealLog.dishes.push({ name: dishName, ...macros });
        mealLog.totals.protein += macros.protein;
        mealLog.totals.carbs += macros.carbs;
        mealLog.totals.fat += macros.fat;
    } else {
        // New meal type for the day, create it
        mealLog = {
            meal: mealType,
            dishes: [{ name: dishName, ...macros }],
            totals: { ...macros },
        };
        MOCK_TODAYS_MACROS.push(mealLog);
    }

    return mealLog;
}
