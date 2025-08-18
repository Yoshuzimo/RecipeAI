
import { DailyMacros, InventoryItem, Macros, PersonalDetails, Settings, Unit, StorageLocation, Recipe } from "./types";
import { adminDb } from './firebase-admin';
import { collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc, writeBatch, query, where, limit, collectionGroup } from 'firebase/firestore';

const MOCK_STORAGE_LOCATIONS: Omit<StorageLocation, 'id'>[] = [
    { name: 'Main Fridge', type: 'Fridge' },
    { name: 'Main Freezer', type: 'Freezer' },
    { name: 'Pantry', type: 'Pantry' },
];

export const seedInitialData = async (userId: string) => {
    console.log(`DATA: Seeding initial data for new user: ${userId}`);
    const batch = adminDb.batch();
    const userRef = adminDb.collection('users').doc(userId);

    // Check if user document already exists to prevent re-seeding
    const userDoc = await userRef.get();
    if (userDoc.exists) {
        console.log("DATA: User document already exists. Skipping seed.");
        return;
    }
    
    console.log(`DATA: Creating user document placeholder for ${userId}.`);
    // Create a placeholder user document
    batch.set(userRef, { createdAt: new Date() });


    // Seed Storage Locations
    console.log(`DATA: Seeding storage locations.`);
    MOCK_STORAGE_LOCATIONS.forEach(loc => {
        const docRef = userRef.collection("storage-locations").doc();
        batch.set(docRef, loc);
    });
    
    // Seed default settings and personal details
    console.log(`DATA: Seeding default settings and personal details.`);
    const settingsRef = userRef.collection("app-data").doc("settings");
    batch.set(settingsRef, {
        unitSystem: 'us',
        aiFeatures: true,
        e2eEncryption: true,
        expiryNotifications: true,
    });

    const personalDetailsRef = userRef.collection("app-data").doc("personal-details");
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
        console.log(`DATA: Committing batch for user ${userId}.`);
        await batch.commit();
        console.log(`DATA: Initial data seeded successfully for user ${userId}.`);
    } catch (error) {
        console.error(`DATA: Error seeding initial data for user ${userId}:`, error);
        throw error; // Re-throw the error after logging
    }
};


// --- Firestore Functions ---

// Storage Locations
export async function getStorageLocations(userId: string): Promise<StorageLocation[]> {
    const q = adminDb.collection(`users/${userId}/storage-locations`);
    const snapshot = await q.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StorageLocation));
}

export async function addStorageLocation(userId: string, location: Omit<StorageLocation, 'id'>): Promise<StorageLocation> {
    const docRef = await adminDb.collection(`users/${userId}/storage-locations`).add(location);
    return { ...location, id: docRef.id };
}

export async function updateStorageLocation(userId: string, location: StorageLocation): Promise<StorageLocation> {
    const { id, ...data } = location;
    await adminDb.collection(`users/${userId}/storage-locations`).doc(id).update(data);
    return location;
}

export async function removeStorageLocation(userId: string, locationId: string): Promise<{id: string}> {
    const itemsInLocationQuery = adminDb.collection(`users/${userId}/inventory`).where("locationId", "==", locationId);
    const itemsSnapshot = await itemsInLocationQuery.get();
    if (!itemsSnapshot.empty) {
        throw new Error("Cannot remove a location that contains inventory items.");
    }
    await adminDb.collection(`users/${userId}/storage-locations`).doc(locationId).delete();
    return { id: locationId };
}


// Inventory
export async function getInventory(userId: string): Promise<InventoryItem[]> {
  const snapshot = await adminDb.collection(`users/${userId}/inventory`).get();
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
    const docRef = await adminDb.collection(`users/${userId}/inventory`).add(item);
    return { ...item, id: docRef.id };
}

export async function updateInventoryItem(userId: string, updatedItem: InventoryItem): Promise<InventoryItem> {
    const { id, ...data } = updatedItem;
    const docRef = adminDb.collection(`users/${userId}/inventory`).doc(id);
    if (data.totalQuantity <= 0) {
        await docRef.delete();
        return { ...updatedItem, totalQuantity: 0 };
    } else {
        await docRef.update(data);
        return updatedItem;
    }
}

export async function removeInventoryItem(userId: string, itemId: string): Promise<{ id: string }> {
    await adminDb.collection(`users/${userId}/inventory`).doc(itemId).delete();
    return { id: itemId };
}

export async function removeInventoryItems(userId: string, itemIds: string[]): Promise<void> {
    if (itemIds.length === 0) return;

    const batch = adminDb.batch();
    itemIds.forEach(id => {
        const docRef = adminDb.collection(`users/${userId}/inventory`).doc(id);
        batch.delete(docRef);
    });
    await batch.commit();
}


// Personal Details
export async function getPersonalDetails(userId: string): Promise<PersonalDetails> {
    const docRef = adminDb.collection(`users/${userId}/app-data`).doc("personal-details");
    const docSnap = await docRef.get();
    return docSnap.exists ? docSnap.data() as PersonalDetails : {};
}

export async function savePersonalDetails(userId: string, details: PersonalDetails): Promise<PersonalDetails> {
    await adminDb.collection(`users/${userId}/app-data`).doc("personal-details").set(details);
    return details;
}

// Settings
export async function getSettings(userId: string): Promise<Settings> {
    const docRef = adminDb.collection(`users/${userId}/app-data`).doc("settings");
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
        const defaultSettings: Settings = {
            unitSystem: 'us',
            aiFeatures: true,
            e2eEncryption: true,
            expiryNotifications: true,
        };
        await docRef.set(defaultSettings);
        return defaultSettings;
    }
    return docSnap.data() as Settings;
}

export async function saveSettings(userId: string, settings: Settings): Promise<Settings> {
    await adminDb.collection(`users/${userId}/app-data`).doc("settings").set(settings);
    return settings;
}

export async function getUnitSystem(userId: string): Promise<'us' | 'metric'> {
    const settings = await getSettings(userId);
    return settings.unitSystem;
}

// Macros
export async function getTodaysMacros(userId: string): Promise<DailyMacros[]> {
    const snapshot = await adminDb.collection(`users/${userId}/daily-macros`).get();
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
    const dailyMacrosCollection = adminDb.collection(`users/${userId}/daily-macros`);
    const q = dailyMacrosCollection.where("meal", "==", mealType);
    const snapshot = await q.get();
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
        await docRef.update({ dishes: updatedDishes, totals: updatedTotals, loggedAt: new Date() });
        return { ...existingLog, id: docRef.id, dishes: updatedDishes, totals: updatedTotals, loggedAt: new Date() };
    } else {
        const newMealLog: Omit<DailyMacros, 'id'> = {
            meal: mealType,
            dishes: [newDish],
            totals: { ...macros },
            loggedAt: new Date(),
        };
        const docRef = await dailyMacrosCollection.add(newMealLog);
        return { ...newMealLog, id: docRef.id };
    }
}

export async function updateMealTime(userId: string, mealId: string, newTime: string): Promise<DailyMacros | null> {
    const docRef = adminDb.collection(`users/${userId}/daily-macros`).doc(mealId);
    const mealLogDoc = await docRef.get();
    if (mealLogDoc.exists) {
        const mealLogData = mealLogDoc.data()!;
        // Ensure loggedAt is a valid Date object before proceeding.
        const mealLog = {
            ...mealLogData,
            loggedAt: mealLogData.loggedAt?.toDate() || new Date(),
        } as DailyMacros;

        const [hours, minutes] = newTime.split(':').map(Number);
        const newDate = new Date(mealLog.loggedAt); // Create a new date object from the valid loggedAt
        newDate.setHours(hours, minutes);
        
        await docRef.update({ loggedAt: newDate });
        return { ...mealLog, loggedAt: newDate };
    }
    return null;
}

// Recipes
export async function getSavedRecipes(userId: string): Promise<Recipe[]> {
    const snapshot = await adminDb.collection(`users/${userId}/saved-recipes`).get();
    return snapshot.docs.map(doc => doc.data() as Recipe);
}

export async function saveRecipe(userId: string, recipe: Recipe): Promise<Recipe> {
    // Firestore can't store custom objects like RecipeIngredient without conversion
    const recipeForDb = { ...recipe, parsedIngredients: JSON.parse(JSON.stringify(recipe.parsedIngredients)) };
    const docId = recipe.title.toLowerCase().replace(/\s+/g, '-');
    const docRef = adminDb.collection(`users/${userId}/saved-recipes`).doc(docId);
    await docRef.set(recipeForDb, { merge: true });
    return recipe;
}

    