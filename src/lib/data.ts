import { InventoryItem } from "./types";

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);
const yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1);
const nextWeek = new Date(today);
nextWeek.setDate(today.getDate() + 7);
const twoDaysFromNow = new Date(today);
twoDaysFromNow.setDate(today.getDate() + 2);

let MOCK_INVENTORY: InventoryItem[] = [
  { id: '1', name: 'Chicken Breast', quantity: 500, unit: 'g', expiryDate: twoDaysFromNow },
  { id: '2', name: 'Broccoli', quantity: 300, unit: 'g', expiryDate: nextWeek },
  { id: '3', name: 'Milk', quantity: 1, unit: 'l', expiryDate: tomorrow },
  { id: '4', name: 'Eggs', quantity: 12, unit: 'pcs', expiryDate: nextWeek },
  { id: '5', name: 'Tomatoes', quantity: 5, unit: 'pcs', expiryDate: nextWeek },
  { id: '6', name: 'Ground Beef', quantity: 400, unit: 'g', expiryDate: yesterday },
  { id: '7', name: 'Cheddar Cheese', quantity: 200, unit: 'g', expiryDate: nextWeek },
  { id: '8', name: 'Lettuce', quantity: 1, unit: 'pcs', expiryDate: twoDaysFromNow },
];

export async function getInventory(): Promise<InventoryItem[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return MOCK_INVENTORY;
}

export async function addInventoryItem(item: Omit<InventoryItem, 'id'>): Promise<InventoryItem> {
  await new Promise(resolve => setTimeout(resolve, 500));
  const newItem = { ...item, id: (MOCK_INVENTORY.length + 1).toString() };
  MOCK_INVENTORY.push(newItem);
  return newItem;
}
