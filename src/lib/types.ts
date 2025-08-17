export type InventoryItem = {
  id: string;
  name: string;
  quantity: number;
  unit: 'g' | 'kg' | 'ml' | 'l' | 'pcs';
  expiryDate: Date;
};
