
import { DailyMacros, InventoryItem, Macros, PersonalDetails, Settings, Unit, StorageLocation, Recipe } from "./types";
import { db } from './firebase';
import { collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc, writeBatch, query, where, limit, collectionGroup } from 'firebase/firestore';

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


const MOCK_STORAGE_LOCATIONS: Omit<StorageLocation, 'id'>[] = [
    { name: 'Main Fridge', type: 'Fridge' },
    { name: 'Main Freezer', type: 'Freezer' },
    { name: 'Pantry', type: 'Pantry' },
];

const MOCK_INVENTORY: Omit<InventoryItem, 'id' | 'locationId'>[] = [
  { name: 'Chicken Breast', originalQuantity: 1, totalQuantity: 1, unit: 'lbs', expiryDate: twoDaysFromNow },
  { name: 'Chicken Breast', originalQuantity: 1.5, totalQuantity: 1.5, unit: 'lbs', expiryDate: nextWeek },
  { name: 'Broccoli', originalQuantity: 12, totalQuantity: 12, unit: 'oz', expiryDate: nextWeek },
  { name: 'Milk', originalQuantity: 1, totalQuantity: 0.5, unit: 'gallon', expiryDate: tomorrow },
  { name: 'Eggs', originalQuantity: 12, totalQuantity: 8, unit: 'pcs', expiryDate: nextWeek },
  { name: 'Tomatoes', originalQuantity: 5, totalQuantity: 5, unit: 'pcs', expiryDate: nextWeek },
  { name: 'Ground Beef', originalQuantity: 1, totalQuantity: 1, unit: 'lbs', expiryDate: yesterday },
  { name: 'Ground Beef', originalQuantity: 1, totalQuantity: 1, unit: 'lbs', expiryDate: threeDaysFromNow },
  { name: 'Cheddar Cheese', originalQuantity: 8, totalQuantity: 6, unit: 'oz', expiryDate: nextWeek },
  { name: 'Lettuce', originalQuantity: 1, totalQuantity: 1, unit: 'pcs', expiryDate: twoDaysFromNow },
  { name: 'Salt', originalQuantity: 1, totalQuantity: 1, unit: 'kg', expiryDate: null },
];

export const seedInitialData = async (userId: string) => {
    console.log(`Seeding initial data for new user: ${userId}`);
    const batch = writeBatch(db);
    const userRef = doc(db, 'users', userId);

    // Check if user document already exists to prevent re-seeding
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
        console.log("User document already exists. Skipping seed.");
        return;
    }
    // Create a placeholder user document
    batch.set(userRef, { createdAt: new Date() });


    // Seed Storage Locations
    const locationRefs: { [key: string]: string } = {};
    MOCK_STORAGE_LOCATIONS.forEach(loc => {
        const docRef = doc(collection(userRef, "storage-locations"));
        batch.set(docRef, loc);
        // Store the generated ID to link inventory items
        if (loc.name.includes('Fridge')) locationRefs.Fridge = docRef.id;
        if (loc.name.includes('Freezer')) locationRefs.Freezer = docRef.id;
        if (loc.name.includes('Pantry')) locationRefs.Pantry = docRef.id;
    });

    // Seed Inventory
    MOCK_INVENTORY.forEach(item => {
        const docRef = doc(collection(userRef, "inventory"));
        let locationId = locationRefs.Pantry; // Default to pantry
        if (item.name.includes('Chicken') || item.name.includes('Beef')) {
            locationId = item.expiryDate && item.expiryDate > twoDaysFromNow ? locationRefs.Freezer : locationRefs.Fridge;
        } else if (item.name.includes('Milk') || item.name.includes('Eggs') || item.name.includes('Cheese') || item.name.includes('Lettuce') || item.name.includes('Broccoli')) {
            locationId = locationRefs.Fridge;
        }
        
        batch.set(docRef, {...item, locationId});
    });
    
    // Seed default settings and personal details
    const settingsRef = doc(userRef, "app-data", "settings");
    batch.set(settingsRef, {
        unitSystem: 'us',
        aiFeatures: true,
        e2eEncryption: true,
        expiryNotifications: true,
    });

    const personalDetailsRef = doc(userRef, "app-data", "personal-details");
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
        console.log(`Initial data seeded successfully for user ${userId}.`);
    } catch (error) {
        console.error(`Error seeding initial data for user ${userId}:`, error);
    }
};


// --- Firestore Functions ---

// Storage Locations
export async function getStorageLocations(userId: string): Promise<StorageLocation[]> {
    const q = query(collection(db, `users/${userId}/storage-locations`));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StorageLocation));
}

export async function addStorageLocation(userId: string, location: Omit<StorageLocation, 'id'>): Promise<StorageLocation> {
    const docRef = await addDoc(collection(db, `users/${userId}/storage-locations`), location);
    return { ...location, id: docRef.id };
}

export async function updateStorageLocation(userId: string, location: StorageLocation): Promise<StorageLocation> {
    const { id, ...data } = location;
    await updateDoc(doc(db, `users/${userId}/storage-locations`, id), data);
    return location;
}

export async function removeStorageLocation(userId: string, locationId: string): Promise<{id: string}> {
    const itemsInLocationQuery = query(collection(db, `users/${userId}/inventory`), where("locationId", "==", locationId));
    const itemsSnapshot = await getDocs(itemsInLocationQuery);
    if (!itemsSnapshot.empty) {
        throw new Error("Cannot remove a location that contains inventory items.");
    }
    await deleteDoc(doc(db, `users/${userId}/storage-locations`, locationId));
    return { id: locationId };
}


// Inventory
export async function getInventory(userId: string): Promise<InventoryItem[]> {
  const snapshot = await getDocs(collection(db, `users/${userId}/inventory`));
  return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
          id: doc.id,
          ...data,
          expiryDate: data.expiryDate?.toDate() ?? null,
      } as InventoryItem;
  });
}

type AddItemData = Omit<InventoryItem, 'id'>;

export async function addInventoryItem(userId: string, item: AddItemData): Promise<InventoryItem> {
    const docRef = await addDoc(collection(db, `users/${userId}/inventory`), item);
    return { ...item, id: docRef.id };
}

export async function updateInventoryItem(userId: string, updatedItem: InventoryItem): Promise<InventoryItem> {
    const { id, ...data } = updatedItem;
    if (data.totalQuantity <= 0) {
        await deleteDoc(doc(db, `users/${userId}/inventory`, id));
        return { ...updatedItem, totalQuantity: 0 };
    } else {
        await updateDoc(doc(db, `users/${userId}/inventory`, id), data);
        return updatedItem;
    }
}

export async function removeInventoryItem(userId: string, itemId: string): Promise<{ id: string }> {
    await deleteDoc(doc(db, `users/${userId}/inventory`, itemId));
    return { id: itemId };
}

export async function removeInventoryItems(userId: string, itemIds: string[]): Promise<void> {
    if (itemIds.length === 0) return;

    const batch = writeBatch(db);
    itemIds.forEach(id => {
        const docRef = doc(db, `users/${userId}/inventory`, id);
        batch.delete(docRef);
    });
    await batch.commit();
}


// Personal Details
export async function getPersonalDetails(userId: string): Promise<PersonalDetails> {
    const docRef = doc(db, `users/${userId}/app-data`, "personal-details");
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() as PersonalDetails : {};
}

export async function savePersonalDetails(userId: string, details: PersonalDetails): Promise<PersonalDetails> {
    await setDoc(doc(db, `users/${userId}/app-data`, "personal-details"), details);
    return details;
}

// Settings
export async function getSettings(userId: string): Promise<Settings> {
    const docRef = doc(db, `users/${userId}/app-data`, "settings");
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

export async function saveSettings(userId: string, settings: Settings): Promise<Settings> {
    await setDoc(doc(db, `users/${userId}/app-data`, "settings"), settings);
    return settings;
}

export async function getUnitSystem(userId: string): Promise<'us' | 'metric'> {
    const settings = await getSettings(userId);
    return settings.unitSystem;
}

// Macros
export async function getTodaysMacros(userId: string): Promise<DailyMacros[]> {
    const snapshot = await getDocs(collection(db, `users/${userId}/daily-macros`));
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            loggedAt: data.loggedAt?.toDate()
        } as DailyMacros;
    });
}

export async function logMacros(userId: string, mealType: "Breakfast" | "Lunch" | "Dinner" | "Snack", dishName: string, macros: Macros): Promise<DailyMacros> {
    const q = query(collection(db, `users/${userId}/daily-macros`), where("meal", "==", mealType));
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
        const docRef = await addDoc(collection(db, `users/${userId}/daily-macros`), newMealLog);
        return { ...newMealLog, id: docRef.id };
    }
}

export async function updateMealTime(userId: string, mealId: string, newTime: string): Promise<DailyMacros | null> {
    const docRef = doc(db, `users/${userId}/daily-macros`, mealId);
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
export async function getSavedRecipes(userId: string): Promise<Recipe[]> {
    const snapshot = await getDocs(collection(db, `users/${userId}/saved-recipes`));
    return snapshot.docs.map(doc => doc.data() as Recipe);
}

export async function saveRecipe(userId: string, recipe: Recipe): Promise<Recipe> {
    // Firestore can't store custom objects like RecipeIngredient without conversion
    const recipeForDb = { ...recipe, parsedIngredients: JSON.parse(JSON.stringify(recipe.parsedIngredients)) };
    const docId = recipe.title.toLowerCase().replace(/\s+/g, '-');
    const docRef = doc(db, `users/${userId}/saved-recipes`, docId);
    await setDoc(docRef, recipeForDb, { merge: true });
    return recipe;
}
