
import { InventoryItem, PersonalDetails, Settings, Unit } from "./types";

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

let MOCK_INVENTORY: InventoryItem[] = [
  { id: '1', name: 'Chicken Breast', quantity: 1, unit: 'lbs', expiryDate: twoDaysFromNow },
  { id: '1a', name: 'Chicken Breast', quantity: 1.5, unit: 'lbs', expiryDate: nextWeek },
  { id: '2', name: 'Broccoli', quantity: 12, unit: 'oz', expiryDate: nextWeek },
  { id: '3', name: 'Milk', quantity: 1, unit: 'gallon', expiryDate: tomorrow },
  { id: '4', name: 'Eggs', quantity: 12, unit: 'pcs', expiryDate: nextWeek },
  { id: '5', name: 'Tomatoes', quantity: 5, unit: 'pcs', expiryDate: nextWeek },
  { id: '6', name: 'Ground Beef', quantity: 1, unit: 'lbs', expiryDate: yesterday },
  { id: '6a', name: 'Ground Beef', quantity: 1, unit: 'lbs', expiryDate: threeDaysFromNow },
  { id: '7', name: 'Cheddar Cheese', quantity: 8, unit: 'oz', expiryDate: nextWeek },
  { id: '8', name: 'Lettuce', quantity: 1, unit: 'pcs', expiryDate: twoDaysFromNow },
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
    e2eEncryption: false,
    expiryNotifications: true,
};

// Simulate client-side local storage
const mockLocalStorage = new Map<string, string>();

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
