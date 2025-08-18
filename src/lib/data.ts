

import { DailyMacros, InventoryItem, Macros, PersonalDetails, Settings, Unit, StorageLocation, Recipe } from "./types";
import { db } from './firebase';
import { collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc, writeBatch, query, where, limit } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

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


const MOCK_STORAGE_LOCATIONS: StorageLocation[] = [
    { id: 'fridge-1', name: 'Main Fridge', type: 'Fridge' },
    { id: 'freezer-1', name: 'Main Freezer', type: 'Freezer' },
    { id: 'pantry-1', name: 'Pantry', type: 'Pantry' },
];

const MOCK_INVENTORY: InventoryItem[] = [
  { id: '1', name: 'Chicken Breast', originalQuantity: 1, totalQuantity: 1, unit: 'lbs', expiryDate: twoDaysFromNow, locationId: 'fridge-1' },
  { id: '1a', name: 'Chicken Breast', originalQuantity: 1.5, totalQuantity: 1.5, unit: 'lbs', expiryDate: nextWeek, locationId: 'freezer-1' },
  { id: '2', name: 'Broccoli', originalQuantity: 12, totalQuantity: 12, unit: 'oz', expiryDate: nextWeek, locationId: 'fridge-1' },
  { id: '3', name: 'Milk', originalQuantity: 1, totalQuantity: 0.5, unit: 'gallon', expiryDate: tomorrow, locationId: 'fridge-1' },
  { id: '4', name: 'Eggs', originalQuantity: 12, totalQuantity: 8, unit: 'pcs', expiryDate: nextWeek, locationId: 'fridge-1' },
  { id: '5', name: 'Tomatoes', originalQuantity: 5, totalQuantity: 5, unit: 'pcs', expiryDate: nextWeek, locationId: 'pantry-1' },
  { id: '6', name: 'Ground Beef', originalQuantity: 1, totalQuantity: 1, unit: 'lbs', expiryDate: yesterday, locationId: 'fridge-1' },
  { id: '6a', name: 'Ground Beef', originalQuantity: 1, totalQuantity: 1, unit: 'lbs', expiryDate: threeDaysFromNow, locationId: 'freezer-1' },
  { id: '7', name: 'Cheddar Cheese', originalQuantity: 8, totalQuantity: 6, unit: 'oz', expiryDate: nextWeek, locationId: 'fridge-1' },
  { id: '8', name: 'Lettuce', originalQuantity: 1, totalQuantity: 1, unit: 'pcs', expiryDate: twoDaysFromNow, locationId: 'fridge-1' },
  { id: '9', name: 'Salt', originalQuantity: 1, totalQuantity: 1, unit: 'kg', expiryDate: null, locationId: 'pantry-1' },
];

export const seedInitialData = async () => {
    console.log("Checking if seeding is needed...");
    // Check if any locations exist. If they do, we assume data is seeded.
    const locationsQuery = query(collection(db, "storage-locations"), limit(1));
    const locationsSnapshot = await getDocs(locationsQuery);
    if (!locationsSnapshot.empty) {
        console.log("Data already exists. Skipping seed.");
        return;
    }

    console.log("Seeding initial data for new user...");
    const batch = writeBatch(db);

    // Seed Storage Locations
    MOCK_STORAGE_LOCATIONS.forEach(loc => {
        const docRef = doc(db, "storage-locations", loc.id);
        batch.set(docRef, loc);
    });

    // Seed Inventory
    MOCK_INVENTORY.forEach(item => {
        const docRef = doc(db, "inventory", item.id);
        batch.set(docRef, item);
    });
    
    // Seed default settings and personal details
    const settingsRef = doc(db, "user-data", "settings");
    batch.set(settingsRef, {
        unitSystem: 'us',
        aiFeatures: true,
        e2eEncryption: true,
        expiryNotifications: true,
    });

    const personalDetailsRef = doc(db, "user-data", "personal-details");
    batch.set(personalDetailsRef, {
        healthGoals: "",
        dietaryRestrictions: "",
        allergies: "",
        favoriteFoods: "",
        dislikedFoods: "",
        healthConditions: "",
        medications: ""
    });

    try {
        await batch.commit();
        console.log("Initial data seeded successfully.");
    } catch (error) {
        console.error("Error seeding initial data:", error);
    }
};


// --- Firestore Functions ---

// Storage Locations
export async function getStorageLocations(): Promise<StorageLocation[]> {
    const q = query(collection(db, "storage-locations"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StorageLocation));
}

export async function addStorageLocation(location: Omit<StorageLocation, 'id'>): Promise<StorageLocation> {
    const docRef = await addDoc(collection(db, "storage-locations"), location);
    return { ...location, id: docRef.id };
}

export async function updateStorageLocation(location: StorageLocation): Promise<StorageLocation> {
    await updateDoc(doc(db, "storage-locations", location.id), { name: location.name });
    return location;
}

export async function removeStorageLocation(locationId: string): Promise<{id: string}> {
    const itemsInLocationQuery = query(collection(db, "inventory"), where("locationId", "==", locationId));
    const itemsSnapshot = await getDocs(itemsInLocationQuery);
    if (!itemsSnapshot.empty) {
        throw new Error("Cannot remove a location that contains inventory items.");
    }
    await deleteDoc(doc(db, "storage-locations", locationId));
    return { id: locationId };
}


// Inventory
export async function getInventory(): Promise<InventoryItem[]> {
  const snapshot = await getDocs(collection(db, "inventory"));
  return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
          id: doc.id,
          ...data,
          expiryDate: data.expiryDate?.toDate() ?? null,
      } as InventoryItem;
  });
}

type AddItemData = {
    name: string;
    totalQuantity: number;
    originalQuantity: number;
    unit: Unit;
    expiryDate: Date | null;
    locationId: string;
}

export async function addInventoryItem(item: AddItemData): Promise<InventoryItem> {
    const docRef = await addDoc(collection(db, "inventory"), item);
    return { ...item, id: docRef.id };
}

export async function updateInventoryItem(updatedItem: InventoryItem): Promise<InventoryItem> {
    const { id, ...data } = updatedItem;
    if (data.totalQuantity <= 0) {
        await deleteDoc(doc(db, "inventory", id));
        return { ...updatedItem, totalQuantity: 0 };
    } else {
        await updateDoc(doc(db, "inventory", id), data);
        return updatedItem;
    }
}

export async function removeInventoryItem(itemId: string): Promise<{ id: string }> {
    await deleteDoc(doc(db, "inventory", itemId));
    return { id: itemId };
}

export async function removeInventoryItems(itemIds: string[]): Promise<void> {
    if (itemIds.length === 0) return;

    const batch = writeBatch(db);
    itemIds.forEach(id => {
        const docRef = doc(db, "inventory", id);
        batch.delete(docRef);
    });
    await batch.commit();
}


// Personal Details
export async function getPersonalDetails(): Promise<PersonalDetails> {
    const docRef = doc(db, "user-data", "personal-details");
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() as PersonalDetails : {};
}

export async function savePersonalDetails(details: PersonalDetails): Promise<PersonalDetails> {
    await setDoc(doc(db, "user-data", "personal-details"), details);
    return details;
}

// Settings
export async function getSettings(): Promise<Settings> {
    const docRef = doc(db, "user-data", "settings");
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
        const defaultSettings: Settings = {
            unitSystem: 'us',
            aiFeatures: true,
            e2eEncryption: true,
            expiryNotifications: true,
        };
        await setDoc(docRef, defaultSettings);
        return defaultSettings;
    }
    return docSnap.data() as Settings;
}

export async function saveSettings(settings: Settings): Promise<Settings> {
    await setDoc(doc(db, "user-data", "settings"), settings);
    return settings;
}

export async function getUnitSystem(): Promise<'us' | 'metric'> {
    const settings = await getSettings();
    return settings.unitSystem;
}

// Macros
export async function getTodaysMacros(): Promise<DailyMacros[]> {
    const snapshot = await getDocs(collection(db, "daily-macros"));
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            loggedAt: data.loggedAt?.toDate()
        } as DailyMacros;
    });
}

export async function logMacros(mealType: "Breakfast" | "Lunch" | "Dinner" | "Snack", dishName: string, macros: Macros): Promise<DailyMacros> {
    const q = query(collection(db, "daily-macros"), where("meal", "==", mealType));
    const snapshot = await getDocs(q);
    const newDish = { name: dishName, ...macros };

    if (!snapshot.empty) {
        const docRef = snapshot.docs[0].ref;
        const existingLog = snapshot.docs[0].data() as DailyMacros;
        const updatedDishes = [...existingLog.dishes, newDish];
        const updatedTotals = {
            protein: existingLog.totals.protein + macros.protein,
            carbs: existingLog.totals.carbs + macros.carbs,
            fat: existingLog.totals.fat + macros.fat,
        };
        await updateDoc(docRef, { dishes: updatedDishes, totals: updatedTotals, loggedAt: new Date() });
        return { ...existingLog, id: docRef.id, dishes: updatedDishes, totals: updatedTotals, loggedAt: new Date() };
    } else {
        const newMealLog: Omit<DailyMacros, 'id'> = {
            meal: mealType,
            dishes: [newDish],
            totals: { ...macros },
            loggedAt: new Date(),
        };
        const docRef = await addDoc(collection(db, "daily-macros"), newMealLog);
        return { ...newMealLog, id: docRef.id };
    }
}

export async function updateMealTime(mealId: string, newTime: string): Promise<DailyMacros | null> {
    const docRef = doc(db, "daily-macros", mealId);
    const mealLogDoc = await getDoc(docRef);
    if (mealLogDoc.exists()) {
        const mealLogData = mealLogDoc.data();
        // Ensure loggedAt is a valid Date object before proceeding.
        const mealLog = {
            ...mealLogData,
            loggedAt: mealLogData.loggedAt?.toDate() || new Date(),
        } as DailyMacros;

        const [hours, minutes] = newTime.split(':').map(Number);
        const newDate = new Date(mealLog.loggedAt); // Create a new date object from the valid loggedAt
        newDate.setHours(hours, minutes);
        
        await updateDoc(docRef, { loggedAt: newDate });
        return { ...mealLog, loggedAt: newDate };
    }
    return null;
}

// Recipes
export async function getSavedRecipes(): Promise<Recipe[]> {
    const snapshot = await getDocs(collection(db, "saved-recipes"));
    return snapshot.docs.map(doc => doc.data() as Recipe);
}

export async function saveRecipe(recipe: Recipe): Promise<Recipe> {
    // Firestore can't store custom objects like RecipeIngredient without conversion
    const recipeForDb = { ...recipe, parsedIngredients: JSON.parse(JSON.stringify(recipe.parsedIngredients)) };
    const docId = recipe.title.toLowerCase().replace(/\s+/g, '-');
    const docRef = doc(db, "saved-recipes", docId);
    await setDoc(docRef, recipeForDb, { merge: true });
    return recipe;
}
