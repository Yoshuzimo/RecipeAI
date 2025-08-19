
import type { DailyMacros, InventoryItem, Macros, PersonalDetails, Settings, Unit, StorageLocation, Recipe, Household, LeaveRequest, RequestedItem } from "./types";
import type { Firestore, WriteBatch, FieldValue } from "firebase-admin/firestore";

const MOCK_STORAGE_LOCATIONS: Omit<StorageLocation, 'id'>[] = [
    { name: 'Main Fridge', type: 'Fridge' },
    { name: 'Main Freezer', type: 'Freezer' },
    { name: 'Pantry', type: 'Pantry' },
];

export const seedInitialData = async (db: Firestore, userId: string) => {
    console.log(`ACTIONS: Starting seedUserData for user: ${userId}`);
    const batch = db.batch();
    const userRef = db.collection('users').doc(userId);

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
export async function getHousehold(db: Firestore, userId: string): Promise<Household | null> {
    const userDoc = await db.collection('users').doc(userId).get();
    const householdId = userDoc.data()?.householdId;
    if (!householdId) {
        return null;
    }
    const householdDoc = await db.collection('households').doc(householdId).get();
    if (!householdDoc.exists) {
        return null;
    }
    
    const householdData = householdDoc.data() as Household;

    const fetchMemberName = async (memberId: string): Promise<string> => {
        const settings = await getSettings(db, memberId);
        return settings.displayName || "Unknown Member";
    };

    // Fetch and update names for active members
    const updatedActiveMembers = await Promise.all(
        householdData.activeMembers.map(async (member) => ({
            ...member,
            userName: await fetchMemberName(member.userId),
        }))
    );
    
    // Fetch and update names for pending members
    const updatedPendingMembers = await Promise.all(
        householdData.pendingMembers.map(async (member) => ({
            ...member,
            userName: await fetchMemberName(member.userId),
        }))
    );
    
    const updatedLeaveRequests = householdData.leaveRequests ? await Promise.all(
        householdData.leaveRequests.map(async (req) => ({
            ...req,
            userName: await fetchMemberName(req.userId),
        }))
    ) : [];


    // Fetch owner's name
    const ownerName = await fetchMemberName(householdData.ownerId);

    return {
        ...householdData,
        id: householdDoc.id,
        activeMembers: updatedActiveMembers,
        pendingMembers: updatedPendingMembers,
        leaveRequests: updatedLeaveRequests,
        ownerName: ownerName,
    };
}


export async function createHousehold(db: Firestore, userId: string, userName: string, inviteCode: string): Promise<Household> {
    const batch = db.batch();
    
    const householdRef = db.collection('households').doc();
    const userRef = db.collection('users').doc(userId);

    const newHousehold: Omit<Household, 'id' | 'ownerName'> = {
        inviteCode,
        ownerId: userId,
        activeMembers: [{ userId, userName }],
        pendingMembers: [],
        leaveRequests: [],
    };

    batch.set(householdRef, newHousehold);
    batch.update(userRef, { householdId: householdRef.id });

    await batch.commit();

    return { ...newHousehold, id: householdRef.id, ownerName: userName };
}

export async function joinHousehold(db: Firestore, arrayUnion: any, userId: string, userName: string, inviteCode: string, mergeInventory: boolean): Promise<Household> {
    return db.runTransaction(async (transaction) => {
        const q = db.collection('households').where('inviteCode', '==', inviteCode).limit(1);
        const snapshot = await transaction.get(q);

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

        const newPendingMember = { userId, userName, wantsToMergeInventory: mergeInventory };
        transaction.update(householdRef, { pendingMembers: arrayUnion(newPendingMember) });
        
        const ownerName = (await getSettings(db, householdData.ownerId)).displayName || "Owner";
        return { ...householdData, id: householdDoc.id, ownerName, pendingMembers: [...householdData.pendingMembers, newPendingMember] };
    });
}

export async function leaveHousehold(db: Firestore, arrayRemove: any, arrayUnion: any, userId: string, newOwnerId: string | undefined, itemsToTake: RequestedItem[]): Promise<void> {
    return db.runTransaction(async (transaction) => {
        const userRef = db.collection('users').doc(userId);
        const userDoc = await transaction.get(userRef);
        const householdId = userDoc.data()?.householdId;

        if (!householdId) throw new Error("You are not currently in a household.");

        const householdRef = db.collection('households').doc(householdId);
        const householdDoc = await transaction.get(householdRef);

        if (!householdDoc.exists) {
            transaction.update(userRef, { householdId: null });
            return;
        }

        const householdData = householdDoc.data() as Household;
        const memberToRemove = householdData.activeMembers.find(m => m.userId === userId);

        if (!memberToRemove) throw new Error("You are not an active member of this household.");

        // 1. Copy items to the leaving user's inventory
        const userInventoryCollection = userRef.collection('inventory');
        for (const item of itemsToTake) {
            const originalItemDoc = await transaction.get(db.collectionGroup('inventory').where('name', '==', item.name).limit(1));
            if (!originalItemDoc.empty) {
                const originalItemData = originalItemDoc.docs[0].data() as InventoryItem;
                 const newItemForLeaver: Omit<InventoryItem, 'id'> = {
                    ...originalItemData,
                    totalQuantity: item.quantity,
                    originalQuantity: item.quantity, // Treat it as a new package
                    ownerId: userId, // Mark as private to the leaver
                 };
                transaction.set(userInventoryCollection.doc(), newItemForLeaver);
            }
        }
        
        // 2. Create a leave request for the owner to review
        const leaveRequest: LeaveRequest = {
            requestId: db.collection('households').doc().id, // Generate a unique ID
            userId: userId,
            userName: memberToRemove.userName,
            requestedItems: itemsToTake,
            status: 'pending_review',
        };
        transaction.update(householdRef, { leaveRequests: arrayUnion(leaveRequest) });


        // 3. Remove user from active members
        transaction.update(householdRef, { activeMembers: arrayRemove(memberToRemove) });

        // 4. Handle ownership transfer or dissolution
        if (householdData.ownerId === userId) {
            const remainingMembers = householdData.activeMembers.filter(m => m.userId !== userId);
            if (remainingMembers.length > 0) {
                if (newOwnerId) {
                    const newOwnerSettings = await getSettings(db, newOwnerId);
                    const newOwnerName = newOwnerSettings.displayName || "New Owner";
                    transaction.update(householdRef, { ownerId: newOwnerId, ownerName: newOwnerName });
                } else {
                    throw new Error("A new owner must be selected before the current owner can leave.");
                }
            } else {
                transaction.delete(householdRef);
            }
        }

        // 5. Unlink user from household
        transaction.update(userRef, { householdId: null });
    });
}

export async function processLeaveRequest(db: Firestore, arrayRemove: any, currentUserId: string, requestId: string, approve: boolean): Promise<Household> {
    return db.runTransaction(async (transaction) => {
        const household = await getHousehold(db, currentUserId);
        if (!household) throw new Error("Could not find household.");
        if (household.ownerId !== currentUserId) throw new Error("Only the owner can process leave requests.");

        const householdRef = db.collection('households').doc(household.id);
        const request = household.leaveRequests?.find(r => r.requestId === requestId);
        if (!request) throw new Error("Leave request not found.");

        if (approve) {
            // Deduct items from owner's inventory
            for (const item of request.requestedItems) {
                const q = db.collection(`users/${currentUserId}/inventory`).where('name', '==', item.name).limit(1);
                const snapshot = await transaction.get(q);
                if (!snapshot.empty) {
                    const doc = snapshot.docs[0];
                    const invItem = doc.data() as InventoryItem;
                    const newQuantity = invItem.totalQuantity - item.quantity;
                    if (newQuantity <= 0) {
                        transaction.delete(doc.ref);
                    } else {
                        transaction.update(doc.ref, { totalQuantity: newQuantity });
                    }
                }
            }
        }

        // Remove the request from the array
        transaction.update(householdRef, { leaveRequests: arrayRemove(request) });
        
        const updatedHousehold = await getHousehold(db, currentUserId);
        if(!updatedHousehold) throw new Error("Could not fetch household after processing request.");
        
        return updatedHousehold;
    });
}


export async function approvePendingMember(db: Firestore, arrayUnion: any, arrayRemove: any, currentUserId: string, householdId: string, memberIdToApprove: string): Promise<Household> {
    return db.runTransaction(async (transaction) => {
        const householdRef = db.collection('households').doc(householdId);
        const memberUserRef = db.collection('users').doc(memberIdToApprove);
        const householdDoc = await transaction.get(householdRef);

        if (!householdDoc.exists) throw new Error("Household not found.");
        
        const householdData = householdDoc.data() as Household;
        if (householdData.ownerId !== currentUserId) {
            throw new Error("Only the household owner can approve new members.");
        }

        const pendingMember = householdData.pendingMembers.find(m => m.userId === memberIdToApprove);
        if (!pendingMember) throw new Error("This user is not pending approval.");

        // Create the active member object without the 'wantsToMergeInventory' flag
        const { wantsToMergeInventory, ...activeMember } = pendingMember;

        transaction.update(householdRef, {
            pendingMembers: arrayRemove(pendingMember),
            activeMembers: arrayUnion(activeMember)
        });
        transaction.update(memberUserRef, { householdId: householdId });
        
        const updatedHousehold = await getHousehold(db, currentUserId);
        if (!updatedHousehold) throw new Error("Failed to refetch household data after approval.");

        return updatedHousehold;
    });
}

export async function approveAndMergeMember(db: Firestore, arrayUnion: any, arrayRemove: any, currentUserId: string, householdId: string, memberIdToApprove: string): Promise<Household> {
    return db.runTransaction(async (transaction) => {
        const householdRef = db.collection('households').doc(householdId);
        const memberUserRef = db.collection('users').doc(memberIdToApprove);
        const ownerUserRef = db.collection('users').doc(currentUserId);
        
        const householdDoc = await transaction.get(householdRef);

        if (!householdDoc.exists) throw new Error("Household not found.");
        
        const householdData = householdDoc.data() as Household;
        if (householdData.ownerId !== currentUserId) {
            throw new Error("Only the household owner can approve new members.");
        }

        const pendingMember = householdData.pendingMembers.find(m => m.userId === memberIdToApprove);
        if (!pendingMember) throw new Error("This user is not pending approval.");

        // --- MERGE LOGIC ---
        const memberInventorySnapshot = await transaction.get(memberUserRef.collection('inventory'));
        const ownerInventoryCollection = ownerUserRef.collection('inventory');

        memberInventorySnapshot.docs.forEach(doc => {
            const itemData = doc.data();
            // We assume items without ownerId are non-private
            if (!itemData.ownerId) {
                // Add to owner's inventory
                transaction.set(ownerInventoryCollection.doc(), itemData);
                // Delete from member's inventory
                transaction.delete(doc.ref);
            }
        });
        // --- END MERGE LOGIC ---

        const { wantsToMergeInventory, ...activeMember } = pendingMember;

        transaction.update(householdRef, {
            pendingMembers: arrayRemove(pendingMember),
            activeMembers: arrayUnion(activeMember)
        });
        transaction.update(memberUserRef, { householdId: householdId });
        
        const updatedHousehold = await getHousehold(db, currentUserId);
        if (!updatedHousehold) throw new Error("Failed to refetch household data after approval.");

        return updatedHousehold;
    });
}

export async function rejectPendingMember(db: Firestore, arrayRemove: any, currentUserId: string, householdId: string, memberIdToReject: string): Promise<Household> {
     return db.runTransaction(async (transaction) => {
        const householdRef = db.collection('households').doc(householdId);
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
        
        const updatedHousehold = await getHousehold(db, currentUserId);
        if (!updatedHousehold) throw new Error("Failed to refetch household data after rejection.");
        
        return updatedHousehold;
    });
}



// --- Firestore Functions ---

// Storage Locations
export async function getStorageLocations(db: Firestore, userId: string): Promise<StorageLocation[]> {
    const household = await getHousehold(db, userId);
    const idToQuery = household ? household.ownerId : userId;
    const q = db.collection(`users/${idToQuery}/storage-locations`);
    const snapshot = await q.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StorageLocation));
}

export async function addStorageLocation(db: Firestore, userId: string, location: Omit<StorageLocation, 'id'>): Promise<StorageLocation> {
    const docRef = await db.collection(`users/${userId}/storage-locations`).add(location);
    return { ...location, id: docRef.id };
}

export async function updateStorageLocation(db: Firestore, userId: string, location: StorageLocation): Promise<StorageLocation> {
    const { id, ...data } = location;
    await db.collection(`users/${userId}/storage-locations`).doc(id).update(data);
    return location;
}

export async function removeStorageLocation(db: Firestore, userId: string, locationId: string): Promise<{id: string}> {
    const itemsInLocationQuery = db.collection(`users/${userId}/inventory`).where("locationId", "==", locationId);
    const itemsSnapshot = await itemsInLocationQuery.get();
    if (!itemsSnapshot.empty) {
        throw new Error("Cannot remove a location that contains inventory items.");
    }
    await db.collection(`users/${userId}/storage-locations`).doc(locationId).delete();
    return { id: locationId };
}


// Inventory
export async function getInventory(db: Firestore, userId: string): Promise<InventoryItem[]> {
  const household = await getHousehold(db, userId);
  
  if (!household) {
    // User is not in a household, fetch only their own inventory
    const snapshot = await db.collection(`users/${userId}/inventory`).get();
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
          id: doc.id,
          ...data,
          expiryDate: data.expiryDate?.toDate() ?? null,
      } as InventoryItem;
    });
  }

  // --- Household Inventory Logic ---
  const memberNames = new Map(household.activeMembers.map(m => [m.userId, m.userName]));
  memberNames.set(household.ownerId, household.ownerName);

  // For the owner, they see their own entire inventory (which is the master list).
  if (userId === household.ownerId) {
     const snapshot = await db.collection(`users/${userId}/inventory`).get();
     return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            expiryDate: data.expiryDate?.toDate() ?? null,
            // Show names for items that are privately owned by other members
            ownerName: data.ownerId && data.ownerId !== userId ? memberNames.get(data.ownerId) : undefined
        } as InventoryItem;
     });
  }

  // For members who are not the owner, they see the owner's non-private inventory plus their own private inventory.
  const ownerInventoryPromise = db.collection(`users/${household.ownerId}/inventory`).where('ownerId', 'in', [null, undefined]).get();
  const userInventoryPromise = db.collection(`users/${userId}/inventory`).where('ownerId', '==', userId).get();

  const [ownerSnapshot, userSnapshot] = await Promise.all([ownerInventoryPromise, userInventoryPromise]);
  
  const ownerItems = ownerSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
          id: doc.id, ...data, expiryDate: data.expiryDate?.toDate() ?? null
      } as InventoryItem;
  });

  const userItems = userSnapshot.docs.map(doc => {
      const data = doc.data();
       return {
          id: doc.id, ...data, expiryDate: data.expiryDate?.toDate() ?? null, ownerName: 'You'
      } as InventoryItem;
  });

  return [...ownerItems, ...userItems];
}


type AddItemData = Omit<InventoryItem, 'id'>;

export async function addInventoryItem(db: Firestore, userId: string, item: AddItemData): Promise<InventoryItem> {
    const docRef = await db.collection(`users/${userId}/inventory`).add(item);
    return { ...item, id: docRef.id };
}

export async function updateInventoryItem(db: Firestore, userId: string, updatedItem: InventoryItem): Promise<InventoryItem> {
    const { id, ...data } = updatedItem;
    const docRef = db.collection(`users/${userId}/inventory`).doc(id);
    if (data.totalQuantity <= 0) {
        await docRef.delete();
        return { ...updatedItem, totalQuantity: 0 };
    } else {
        await docRef.update(data);
        return updatedItem;
    }
}

export async function removeInventoryItem(db: Firestore, userId: string, itemId: string): Promise<{ id: string }> {
    await db.collection(`users/${userId}/inventory`).doc(itemId).delete();
    return { id: itemId };
}

export async function removeInventoryItems(db: Firestore, userId: string, itemIds: string[]): Promise<void> {
    if (itemIds.length === 0) return;

    const batch = db.batch();
    itemIds.forEach(id => {
        const docRef = db.collection(`users/${userId}/inventory`).doc(id);
        batch.delete(docRef);
    });
    await batch.commit();
}


// Personal Details
export async function getPersonalDetails(db: Firestore, userId: string): Promise<PersonalDetails> {
    const docRef = db.collection(`users/${userId}/app-data`).doc("personal-details");
    const docSnap = await docRef.get();
    return docSnap.exists ? docSnap.data() as PersonalDetails : {};
}

export async function savePersonalDetails(db: Firestore, userId: string, details: PersonalDetails): Promise<PersonalDetails> {
    await db.collection(`users/${userId}/app-data`).doc("personal-details").set(details);
    return details;
}

// Settings
export async function getSettings(db: Firestore, userId: string): Promise<Settings> {
    const userDocRef = db.collection('users').doc(userId);
    const settingsDocRef = userDocRef.collection("app-data").doc("settings");
    
    let settingsDoc = await settingsDocRef.get();
    if (!settingsDoc.exists) {
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
        await settingsDocRef.set(defaultSettings);
        settingsDoc = await settingsDocRef.get();
    }
    return settingsDoc.data() as Settings;
}

export async function saveSettings(db: Firestore, userId: string, settings: Settings): Promise<Settings> {
    await db.collection(`users/${userId}/app-data`).doc("settings").set(settings);
    return settings;
}

// Macros
export async function getTodaysMacros(db: Firestore, userId: string): Promise<DailyMacros[]> {
    const snapshot = await db.collection(`users/${userId}/daily-macros`).get();
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            loggedAt: data.loggedAt?.toDate()
        } as DailyMacros;
    });
}

export async function logMacros(db: Firestore, userId: string, mealType: "Breakfast" | "Lunch" | "Dinner" | "Snack", dishName: string, macros: Macros): Promise<DailyMacros> {
    const dailyMacrosCollection = db.collection(`users/${userId}/daily-macros`);
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

export async function updateMealTime(db: Firestore, userId: string, mealId: string, newTime: string): Promise<DailyMacros | null> {
    const docRef = db.collection(`users/${userId}/daily-macros`).doc(mealId);
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
        return { ...mealLog, id: mealId, loggedAt: newDate };
    }
    return null;
}

// Recipes
export async function getSavedRecipes(db: Firestore, userId: string): Promise<Recipe[]> {
    const snapshot = await db.collection(`users/${userId}/saved-recipes`).get();
    return snapshot.docs.map(doc => doc.data() as Recipe);
}

export async function saveRecipe(db: Firestore, userId: string, recipe: Recipe): Promise<Recipe> {
    // Firestore can't store custom objects like RecipeIngredient without conversion
    const recipeForDb = { ...recipe, parsedIngredients: JSON.parse(JSON.stringify(recipe.parsedIngredients)) };
    const docId = recipe.title.toLowerCase().replace(/\s+/g, '-');
    const docRef = db.collection(`users/${userId}/saved-recipes`).doc(docId);
    await docRef.set(recipeForDb, { merge: true });
    return recipe;
}
