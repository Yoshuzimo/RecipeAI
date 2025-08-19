

import type { DailyMacros, InventoryItem, Macros, PersonalDetails, Settings, Unit, StorageLocation, Recipe, Household, LeaveRequest, RequestedItem, ShoppingListItem, NewInventoryItem, ItemMigrationMapping } from "./types";
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

    const userDoc = await userRef.get();
    if (userDoc.exists) {
        console.log(`DATA: User ${userId} already exists. Skipping seed.`);
        return;
    }
    
    batch.set(userRef, { createdAt: new Date(), householdId: null });

    MOCK_STORAGE_LOCATIONS.forEach(loc => {
        const docRef = userRef.collection("storage-locations").doc();
        batch.set(docRef, loc);
    });
    
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
        throw error;
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

    const locationsSnapshot = await db.collection(`households/${householdId}/storage-locations`).get();
    const locations = locationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StorageLocation));

    const fetchMemberName = async (memberId: string): Promise<string> => {
        const settings = await getSettings(db, memberId);
        return settings.displayName || "Unknown Member";
    };

    const updatedActiveMembers = await Promise.all(
        householdData.activeMembers.map(async (member) => ({
            ...member,
            userName: await fetchMemberName(member.userId),
        }))
    );
    
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

    const ownerName = await fetchMemberName(householdData.ownerId);

    return {
        ...householdData,
        id: householdDoc.id,
        activeMembers: updatedActiveMembers,
        pendingMembers: updatedPendingMembers,
        leaveRequests: updatedLeaveRequests,
        ownerName: ownerName,
        locations: locations,
    };
}


export async function createHousehold(db: Firestore, userId: string, userName: string, inviteCode: string, userLocations: StorageLocation[]): Promise<Household> {
    const batch = db.batch();
    
    const householdRef = db.collection('households').doc();
    const userRef = db.collection('users').doc(userId);

    const newHousehold: Omit<Household, 'id' | 'ownerName' | 'locations'> = {
        inviteCode,
        ownerId: userId,
        activeMembers: [{ userId, userName }],
        pendingMembers: [],
        leaveRequests: [],
    };
    
    batch.set(householdRef, newHousehold);

    const householdLocationsCollection = householdRef.collection('storage-locations');
    userLocations.forEach(loc => {
        const newLocRef = householdLocationsCollection.doc();
        batch.set(newLocRef, { name: loc.name, type: loc.type });
    });

    const inventoryRef = householdRef.collection('inventory').doc(); // Create one dummy doc to ensure collection exists
    batch.set(inventoryRef, { initialized: true });
    const shoppingListRef = householdRef.collection('shopping-list').doc();
    batch.set(shoppingListRef, { initialized: true });

    batch.update(userRef, { householdId: householdRef.id });

    await batch.commit();

    return { ...newHousehold, id: householdRef.id, ownerName: userName, locations: userLocations };
}

export async function joinHousehold(db: Firestore, arrayUnion: any, userId: string, userName: string, inviteCode: string, mergeInventory: boolean, itemMigrationMapping: ItemMigrationMapping): Promise<Household> {
    return db.runTransaction(async (transaction) => {
        const q = db.collection('households').where('inviteCode', '==', inviteCode).limit(1);
        const snapshot = await transaction.get(q);

        if (snapshot.empty) {
            throw new Error("Invalid invite code. Please check the code and try again.");
        }

        const householdDoc = snapshot.docs[0];
        const householdRef = householdDoc.ref;
        const householdData = householdDoc.data() as Household;

        if (householdData.activeMembers.some(m => m.userId === userId) || householdData.pendingMembers.some(m => m.userId === userId)) {
            throw new Error("You are already a member or have a pending request for this household.");
        }

        const newPendingMember = { userId, userName, wantsToMergeInventory: mergeInventory, itemMigrationMapping };
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

        const userInventoryCollection = userRef.collection('inventory');
        for (const item of itemsToTake) {
            const originalItemDocQuery = householdRef.collection('inventory').where('name', '==', item.name).limit(1);
            const originalItemDocSnapshot = await transaction.get(originalItemDocQuery);
            if (!originalItemDocSnapshot.empty) {
                const originalItemData = originalItemDocSnapshot.docs[0].data() as InventoryItem;
                 const newItemForLeaver: Omit<InventoryItem, 'id' | 'isPrivate'> = {
                    ...originalItemData,
                    totalQuantity: item.quantity,
                    originalQuantity: item.quantity,
                 };
                transaction.set(userInventoryCollection.doc(), newItemForLeaver);
            }
        }
        
        const leaveRequest: LeaveRequest = {
            requestId: db.collection('households').doc().id,
            userId: userId,
            userName: memberToRemove.userName,
            requestedItems: itemsToTake,
            status: 'pending_review',
        };
        transaction.update(householdRef, { leaveRequests: arrayUnion(leaveRequest) });

        transaction.update(householdRef, { activeMembers: arrayRemove(memberToRemove) });

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
                // Last person leaving, delete household locations too
                const locationsSnapshot = await transaction.get(householdRef.collection('storage-locations'));
                locationsSnapshot.docs.forEach(doc => transaction.delete(doc.ref));
                transaction.delete(householdRef);
            }
        }

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
            for (const item of request.requestedItems) {
                const q = householdRef.collection('inventory').where('name', '==', item.name).limit(1);
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

        const { wantsToMergeInventory, itemMigrationMapping, ...activeMember } = pendingMember;

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
        
        const householdDoc = await transaction.get(householdRef);

        if (!householdDoc.exists) throw new Error("Household not found.");
        
        const householdData = householdDoc.data() as Household;
        if (householdData.ownerId !== currentUserId) {
            throw new Error("Only the household owner can approve new members.");
        }

        const pendingMember = householdData.pendingMembers.find(m => m.userId === memberIdToApprove);
        if (!pendingMember) throw new Error("This user is not pending approval.");
        if (!pendingMember.itemMigrationMapping) throw new Error("Item migration mapping is missing for inventory merge.");

        const memberInventorySnapshot = await transaction.get(memberUserRef.collection('inventory'));
        const householdInventoryCollection = householdRef.collection('inventory');

        for (const doc of memberInventorySnapshot.docs) {
            const itemData = doc.data() as Omit<InventoryItem, 'id' | 'isPrivate'>;
            const migrationInfo = pendingMember.itemMigrationMapping![doc.id];
            
            if (!migrationInfo) {
                console.warn(`No migration mapping found for item ${itemData.name} (${doc.id}). Skipping.`);
                continue;
            }

            const { newLocationId, keepPrivate } = migrationInfo;
            const updatedItemData = { ...itemData, locationId: newLocationId };

            if (keepPrivate) {
                // Item stays in user's collection, just update its locationId
                transaction.update(doc.ref, { locationId: newLocationId });
            } else {
                // Item moves to household collection
                transaction.set(householdInventoryCollection.doc(), updatedItemData);
                transaction.delete(doc.ref);
            }
        }
        
        const { wantsToMergeInventory, itemMigrationMapping, ...activeMember } = pendingMember;

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
    const collectionPath = household 
        ? `households/${household.id}/storage-locations` 
        : `users/${userId}/storage-locations`;
        
    const q = db.collection(collectionPath);
    const snapshot = await q.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StorageLocation));
}

export async function addStorageLocation(db: Firestore, userId: string, location: Omit<StorageLocation, 'id'>): Promise<StorageLocation> {
    const household = await getHousehold(db, userId);
    const collectionPath = household 
        ? `households/${household.id}/storage-locations` 
        : `users/${userId}/storage-locations`;
    const docRef = await db.collection(collectionPath).add(location);
    return { ...location, id: docRef.id };
}

export async function updateStorageLocation(db: Firestore, userId: string, location: StorageLocation): Promise<StorageLocation> {
    const household = await getHousehold(db, userId);
    const collectionPath = household 
        ? `households/${household.id}/storage-locations` 
        : `users/${userId}/storage-locations`;
    const { id, ...data } = location;
    await db.collection(collectionPath).doc(id).update(data);
    return location;
}

export async function removeStorageLocation(db: Firestore, userId: string, locationId: string): Promise<{id: string}> {
    const household = await getHousehold(db, userId);
    const collectionPath = household 
        ? `households/${household.id}/storage-locations` 
        : `users/${userId}/storage-locations`;

    // Check both user and household inventories for items in this location before deleting
    const userItemsQuery = db.collection(`users/${userId}/inventory`).where("locationId", "==", locationId);
    const userItemsSnapshot = await userItemsQuery.get();
    if (!userItemsSnapshot.empty) {
        throw new Error("Cannot remove a location that contains personal inventory items.");
    }
    
    if (household) {
        const householdItemsQuery = db.collection(`households/${household.id}/inventory`).where("locationId", "==", locationId);
        const householdItemsSnapshot = await householdItemsQuery.get();
        if (!householdItemsSnapshot.empty) {
            throw new Error("Cannot remove a location that contains household inventory items.");
        }
    }

    await db.collection(collectionPath).doc(locationId).delete();
    return { id: locationId };
}


// Inventory
export async function getInventory(db: Firestore, userId: string): Promise<InventoryItem[]> {
    const household = await getHousehold(db, userId);

    // Fetch the current user's personal inventory
    const userInventorySnapshot = await db.collection(`users/${userId}/inventory`).get();
    const userItems = userInventorySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            isPrivate: true,
            expiryDate: data.expiryDate?.toDate() ?? null,
        } as InventoryItem;
    });
  
    if (!household) {
      // User is not in a household, return only their own items
      return userItems;
    }
  
    // If in a household, fetch the shared household inventory
    const householdInventorySnapshot = await db.collection(`households/${household.id}/inventory`).get();
    const householdItems = householdInventorySnapshot.docs.map(doc => {
        const data = doc.data();
         if (data.initialized) return null; // Skip dummy doc
        return {
            id: doc.id,
            ...data,
            isPrivate: false,
            expiryDate: data.expiryDate?.toDate() ?? null,
        } as InventoryItem;
    }).filter((item): item is InventoryItem => item !== null);

    // Combine and return both lists
    return [...userItems, ...householdItems];
}


export async function addInventoryItem(db: Firestore, userId: string, item: NewInventoryItem): Promise<InventoryItem> {
    const household = await getHousehold(db, userId);
    
    const collectionPath = (household && !item.isPrivate)
        ? `households/${household!.id}/inventory`
        : `users/${userId}/inventory`;

    // We don't store the isPrivate flag in the database, it's derived.
    const { isPrivate, ...itemToAdd } = item;

    const docRef = await db.collection(collectionPath).add(itemToAdd);

    return { 
        ...item, 
        id: docRef.id,
    };
}

export async function updateInventoryItem(db: Firestore, userId: string, updatedItem: InventoryItem): Promise<InventoryItem> {
    const household = await getHousehold(db, userId);
    const { id, isPrivate, ...data } = updatedItem;

    const collectionPath = (household && !isPrivate)
        ? `households/${household.id}/inventory`
        : `users/${userId}/inventory`;
    
    const docRef = db.collection(collectionPath).doc(id);

    if (data.totalQuantity <= 0) {
        await docRef.delete();
        return { ...updatedItem, totalQuantity: 0 };
    } else {
        await docRef.update(data);
        return updatedItem;
    }
}

export async function removeInventoryItem(db: Firestore, userId: string, item: InventoryItem): Promise<{ id: string }> {
    const household = await getHousehold(db, userId);
    const collectionPath = (household && !item.isPrivate)
        ? `households/${household.id}/inventory`
        : `users/${userId}/inventory`;

    await db.collection(collectionPath).doc(item.id).delete();
    return { id: item.id };
}

export async function removeInventoryItems(db: Firestore, userId: string, items: InventoryItem[]): Promise<void> {
    if (items.length === 0) return;
    const household = await getHousehold(db, userId);
    const batch = db.batch();

    items.forEach(item => {
        const collectionPath = (household && !item.isPrivate)
            ? `households/${household.id}/inventory`
            : `users/${userId}/inventory`;

        const docRef = db.collection(collectionPath).doc(item.id);
        batch.delete(docRef);
    });

    await batch.commit();
}

export async function toggleItemPrivacy(db: Firestore, userId: string, householdId: string, items: InventoryItem[], makePrivate: boolean): Promise<void> {
    return db.runTransaction(async (transaction) => {
        for (const item of items) {
            const isCurrentlyPrivate = item.isPrivate;

            if (isCurrentlyPrivate === makePrivate) {
                continue; 
            }

            const sourceCollectionPath = isCurrentlyPrivate ? `users/${userId}/inventory` : `households/${householdId}/inventory`;
            const destCollectionPath = makePrivate ? `users/${userId}/inventory` : `households/${householdId}/inventory`;
            
            const sourceDocRef = db.collection(sourceCollectionPath).doc(item.id);
            const destDocRef = db.collection(destCollectionPath).doc(); // Create a new doc in the destination

            const itemDoc = await transaction.get(sourceDocRef);
            if (!itemDoc.exists) {
                console.warn(`Item with ID ${item.id} not found in ${sourceCollectionPath}. Skipping.`);
                continue;
            }

            const itemData = itemDoc.data()!;
            
            // We don't store the isPrivate flag, so just move the data
            transaction.set(destDocRef, itemData);
            transaction.delete(sourceDocRef);
        }
    });
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
        const mealLog = {
            ...mealLogData,
            loggedAt: mealLogData.loggedAt?.toDate() || new Date(),
        } as DailyMacros;

        const [hours, minutes] = newTime.split(':').map(Number);
        const newDate = new Date(mealLog.loggedAt); 
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
    const recipeForDb = { ...recipe, parsedIngredients: JSON.parse(JSON.stringify(recipe.parsedIngredients)) };
    const docId = recipe.title.toLowerCase().replace(/\s+/g, '-');
    const docRef = db.collection(`users/${userId}/saved-recipes`).doc(docId);
    await docRef.set(recipeForDb, { merge: true });
    return recipe;
}


// --- Shopping List ---
async function getShoppingListCollection(db: Firestore, userId: string) {
    const household = await getHousehold(db, userId);
    return household 
        ? db.collection(`households/${household.id}/shopping-list`)
        : db.collection(`users/${userId}/shopping-list`);
}

export async function getShoppingList(db: Firestore, userId: string): Promise<ShoppingListItem[]> {
    const collectionRef = await getShoppingListCollection(db, userId);
    const snapshot = await collectionRef.orderBy('addedAt', 'asc').get();
    return snapshot.docs
        .map(doc => {
            const data = doc.data();
            if (data.initialized) return null; // Skip dummy doc
            return {
                id: doc.id,
                ...data,
                addedAt: data.addedAt?.toDate(),
            } as ShoppingListItem
        })
        .filter((item): item is ShoppingListItem => item !== null);
}

export async function addShoppingListItem(db: Firestore, userId: string, item: Omit<ShoppingListItem, 'id' | 'addedAt' >): Promise<ShoppingListItem> {
    const collectionRef = await getShoppingListCollection(db, userId);
    const newItem = { ...item, addedAt: new Date() };
    const docRef = await collectionRef.add(newItem);
    return { ...newItem, id: docRef.id };
}

export async function updateShoppingListItem(db: Firestore, userId: string, item: ShoppingListItem): Promise<ShoppingListItem> {
    const collectionRef = await getShoppingListCollection(db, userId);
    const { id, ...data } = item;
    await collectionRef.doc(id).update(data);
    return item;
}

export async function removeShoppingListItem(db: Firestore, userId: string, itemId: string): Promise<{id: string}> {
    const collectionRef = await getShoppingListCollection(db, userId);
    await collectionRef.doc(itemId).delete();
    return { id: itemId };
}

export async function removeCheckedShoppingListItems(db: Firestore, userId: string): Promise<void> {
    const collectionRef = await getShoppingListCollection(db, userId);
    const snapshot = await collectionRef.where('checked', '==', true).get();
    if (snapshot.empty) return;

    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
}
