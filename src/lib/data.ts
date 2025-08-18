

import { DailyMacros, InventoryItem, Macros, PersonalDetails, Settings, Unit, StorageLocation, Recipe, Household } from "./types";
import { adminDb } from './firebase-admin';
import { collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc, writeBatch, query, where, limit, collectionGroup, runTransaction, arrayUnion, arrayRemove } from 'firebase/admin/firestore';

const MOCK_STORAGE_LOCATIONS: Omit<StorageLocation, 'id'>[] = [
    { name: 'Main Fridge', type: 'Fridge' },
    { name: 'Main Freezer', type: 'Freezer' },
    { name: 'Pantry', type: 'Pantry' },
];

export const seedInitialData = async (userId: string) => {
    console.log(`ACTIONS: Starting seedUserData for user: ${userId}`);
    const batch = adminDb.batch();
    const userRef = adminDb.collection('users').doc(userId);

    // Check if user document already exists to prevent re-seeding
    const userDoc = await userRef.get();
    if (userDoc.exists) {
        console.log(`DATA: User ${userId} already exists. Skipping seed.`);
        return;
    }
    
    // Create a placeholder user document with no householdId initially
    batch.set(userRef, { createdAt: new Date(), householdId: null });


    // Seed Storage Locations
    MOCK_STORAGE_LOCATIONS.forEach(loc => {
        const docRef = userRef.collection("storage-locations").doc();
        batch.set(docRef, loc);
    });
    
    // Seed default settings and personal details
    const settingsRef = userRef.collection("app-data").doc("settings");
    batch.set(settingsRef, {
        displayName: 'New User',
        unitSystem: 'us',
        subscriptionStatus: 'free',
        aiFeatures: true,
        e2eEncryption: true,
        expiryNotifications: true,
        calorieGoal: 2000,
        proteinGoal: 150,
        carbsGoal: 250,
        fatGoal: 70,
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
        await batch.commit();
        console.log(`DATA: Successfully seeded data for new user ${userId}`);
    } catch (error) {
        console.error(`DATA: Error seeding initial data for user ${userId}:`, error);
        throw error; // Re-throw the error after logging
    }
};


// --- Household Functions ---

export async function createHousehold(userId: string, userName: string, inviteCode: string): Promise<Household> {
    const batch = adminDb.batch();
    
    const householdRef = adminDb.collection('households').doc();
    const userRef = adminDb.collection('users').doc(userId);

    const newHousehold: Household = {
        id: householdRef.id,
        inviteCode,
        ownerId: userId,
        activeMembers: [{ userId, userName }],
        pendingMembers: [],
    };

    batch.set(householdRef, newHousehold);
    batch.update(userRef, { householdId: householdRef.id });

    await batch.commit();

    return newHousehold;
}

export async function joinHousehold(userId: string, userName: string, inviteCode: string): Promise<Household> {
    return runTransaction(adminDb, async (transaction) => {
        const q = query(adminDb.collection('households'), where('inviteCode', '==', inviteCode), limit(1));
        const snapshot = await q.get();

        if (snapshot.empty) {
            throw new Error("Invalid invite code. Please check the code and try again.");
        }

        const householdDoc = snapshot.docs[0];
        const householdRef = householdDoc.ref;
        const householdData = householdDoc.data() as Household;

        // Check if user is already an active or pending member
        if (householdData.activeMembers.some(m => m.userId === userId) || householdData.pendingMembers.some(m => m.userId === userId)) {
            throw new Error("You are already a member or have a pending request for this household.");
        }

        const newPendingMember = { userId, userName };
        transaction.update(householdRef, { pendingMembers: arrayUnion(newPendingMember) });
        
        return { ...householdData, pendingMembers: [...householdData.pendingMembers, newPendingMember] };
    });
}

export async function leaveHousehold(userId: string, newOwnerId?: string): Promise<void> {
    await runTransaction(adminDb, async (transaction) => {
        const userRef = adminDb.collection('users').doc(userId);
        const userDoc = await transaction.get(userRef);
        const householdId = userDoc.data()?.householdId;

        if (!householdId) {
            throw new Error("You are not currently in a household.");
        }

        const householdRef = adminDb.collection('households').doc(householdId);
        const householdDoc = await transaction.get(householdRef);

        if (!householdDoc.exists) {
            transaction.update(userRef, { householdId: null });
            return;
        }

        const householdData = householdDoc.data() as Household;
        const memberToRemove = householdData.activeMembers.find(m => m.userId === userId);

        if (memberToRemove) {
            transaction.update(householdRef, { activeMembers: arrayRemove(memberToRemove) });
        }

        if (householdData.ownerId === userId) {
            // Owner is leaving
            const remainingMembers = householdData.activeMembers.filter(m => m.userId !== userId);
            if (remainingMembers.length > 0) {
                if (newOwnerId) {
                    // Transfer ownership
                    transaction.update(householdRef, { ownerId: newOwnerId });
                } else {
                    throw new Error("A new owner must be selected before the current owner can leave.");
                }
            } else {
                // Last member is leaving, delete the household
                transaction.delete(householdRef);
            }
        }

        transaction.update(userRef, { householdId: null });
    });
}


export async function approvePendingMember(currentUserId: string, householdId: string, memberIdToApprove: string): Promise<Household> {
    return runTransaction(adminDb, async (transaction) => {
        const householdRef = adminDb.collection('households').doc(householdId);
        const memberUserRef = adminDb.collection('users').doc(memberIdToApprove);
        const householdDoc = await transaction.get(householdRef);

        if (!householdDoc.exists) throw new Error("Household not found.");
        
        const householdData = householdDoc.data() as Household;
        if (householdData.ownerId !== currentUserId) {
            throw new Error("Only the household owner can approve new members.");
        }

        const pendingMember = householdData.pendingMembers.find(m => m.userId === memberIdToApprove);
        if (!pendingMember) throw new Error("This user is not pending approval.");

        transaction.update(householdRef, {
            pendingMembers: arrayRemove(pendingMember),
            activeMembers: arrayUnion(pendingMember)
        });
        transaction.update(memberUserRef, { householdId: householdId });

        return {
            ...householdData,
            pendingMembers: householdData.pendingMembers.filter(m => m.userId !== memberIdToApprove),
            activeMembers: [...householdData.activeMembers, pendingMember],
        };
    });
}

export async function rejectPendingMember(currentUserId: string, householdId: string, memberIdToReject: string): Promise<Household> {
     return runTransaction(adminDb, async (transaction) => {
        const householdRef = adminDb.collection('households').doc(householdId);
        const householdDoc = await transaction.get(householdRef);

        if (!householdDoc.exists) throw new Error("Household not found.");
        
        const householdData = householdDoc.data() as Household;
         if (householdData.ownerId !== currentUserId) {
            throw new Error("Only the household owner can reject requests.");
        }

        const pendingMember = householdData.pendingMembers.find(m => m.userId === memberIdToReject);
        if (!pendingMember) throw new Error("This user is not pending approval.");

        transaction.update(householdRef, {
            pendingMembers: arrayRemove(pendingMember),
        });

        return {
            ...householdData,
            pendingMembers: householdData.pendingMembers.filter(m => m.userId !== memberIdToReject),
        };
    });
}



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
            displayName: "New User",
            unitSystem: 'us',
            subscriptionStatus: 'free',
            aiFeatures: true,
            e2eEncryption: true,
            expiryNotifications: true,
            calorieGoal: 2000,
            proteinGoal: 150,
            carbsGoal: 250,
            fatGoal: 70,
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
