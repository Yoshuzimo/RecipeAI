export type InventoryItem = {
  id: string;
  name: string;
  quantity: number;
  unit: 'g' | 'kg' | 'ml' | 'l' | 'pcs';
  expiryDate: Date;
};

export type PersonalDetails = {
  healthGoals?: string;
  dietaryRestrictions?: string;
  allergies?: string;
  favoriteFoods?: string;
  dislikedFoods?: string;
  healthConditions?: string;
  medications?: string;
}
