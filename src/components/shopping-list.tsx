

"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import type { InventoryItem, PersonalDetails, ShoppingListItem, AIShoppingSuggestion } from "@/lib/types";
import { 
    addClientShoppingListItem,
    updateClientShoppingListItem,
    removeClientShoppingListItem,
    removeClientCheckedShoppingListItems,
    getClientTodaysMacros,
    handleUpdateItemThreshold
} from "@/app/actions";
import { generateShoppingSuggestions } from "@/ai/flows/generate-shopping-suggestions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Sparkles, AlertCircle, PlusCircle, Trash2, Settings, ChevronDown, ChevronUp, ShoppingBag } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Skeleton } from "./ui/skeleton";
import { Input } from "./ui/input";
import { useForm, SubmitHandler } from "react-hook-form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Checkbox } from "./ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuItem } from "./ui/dropdown-menu";
import { BuyItemsDialog } from "./buy-items-dialog";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter } from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Label } from "./ui/label";


type AddItemForm = {
    item: string;
};

const ManageThresholdsDialog = ({
    isOpen,
    setIsOpen,
    inventory,
    onThresholdsUpdate,
}: {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    inventory: InventoryItem[];
    onThresholdsUpdate: (itemId: string, newThreshold: number | null) => void;
}) => {
    const [thresholds, setThresholds] = useState<Record<string, string>>({});

    useEffect(() => {
        const initialThresholds: Record<string, string> = {};
        inventory.forEach(item => {
            if (item.restockThreshold) {
                initialThresholds[item.id] = String(item.restockThreshold);
            }
        });
        setThresholds(initialThresholds);
    }, [inventory]);

    const handleThresholdChange = (itemId: string, value: string) => {
        setThresholds(prev => ({...prev, [itemId]: value}));
    };

    const handleSave = async () => {
        for (const itemId in thresholds) {
            const thresholdValue = thresholds[itemId];
            const numericValue = thresholdValue === '' ? null : Number(thresholdValue);
            
            if (numericValue !== null && isNaN(numericValue)) continue;

            const originalItem = inventory.find(item => item.id === itemId);
            if (originalItem?.restockThreshold !== numericValue) {
                await handleUpdateItemThreshold(itemId, numericValue);
                onThresholdsUpdate(itemId, numericValue);
            }
        }
        setIsOpen(false);
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Manage Restock Thresholds</DialogTitle>
                    <DialogDescription>
                        Set a custom quantity to be alerted when an item is running low. Leave blank to use the default (25%).
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-96 pr-4 my-4">
                    <div className="space-y-4">
                        {inventory.map(item => (
                            <div key={item.id} className="grid grid-cols-3 items-center gap-4">
                                <Label htmlFor={`threshold-${item.id}`} className="col-span-1">{item.name}</Label>
                                <div className="col-span-2 flex items-center gap-2">
                                     <Input
                                        id={`threshold-${item.id}`}
                                        type="number"
                                        placeholder={`Default (25%)`}
                                        value={thresholds[item.id] || ""}
                                        onChange={(e) => handleThresholdChange(item.id, e.target.value)}
                                     />
                                     <span className="text-sm text-muted-foreground">{item.unit}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save Thresholds</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export function ShoppingList({ initialInventoryData, personalDetails, initialShoppingList }: { 
    initialInventoryData: { privateItems: InventoryItem[], sharedItems: InventoryItem[] }, 
    personalDetails: PersonalDetails,
    initialShoppingList: ShoppingListItem[]
}) {
  const [isAiPending, startAiTransition] = useTransition();
  const { toast } = useToast();

  const [inventory, setInventory] = useState<InventoryItem[]>([...initialInventoryData.privateItems, ...initialInventoryData.sharedItems]);
  const [myShoppingList, setMyShoppingList] = useState<ShoppingListItem[]>(initialShoppingList);
  const [aiSuggestions, setAiSuggestions] = useState<AIShoppingSuggestion[]>([]);
  
  const [itemToAdd, setItemToAdd] = useState<Omit<ShoppingListItem, 'id' | 'addedAt' | 'checked'> | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<ShoppingListItem | null>(null);
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [isThresholdsOpen, setIsThresholdsOpen] = useState(false);

  const { register, handleSubmit, reset } = useForm<AddItemForm>();

  const lowOnStockItems = useMemo(() => {
    return inventory.filter(item => {
        if (item.restockThreshold) {
            return item.totalQuantity < item.restockThreshold;
        }
        return (item.totalQuantity / item.originalQuantity) < 0.25;
    });
  }, [inventory]);

  const checkedItems = useMemo(() => myShoppingList.filter(item => item.checked), [myShoppingList]);
  const hasCheckedItems = checkedItems.length > 0;
  
  const handleGenerateAISuggestions = () => {
    startAiTransition(async () => {
        setAiSuggestions([]);
        const dailyMacros = await getClientTodaysMacros();
        const consumptionHistory = dailyMacros.map(m => `- ${m.meal}: ${m.dishes.map(d => d.name).join(', ')}`).join('\n');
        const inventoryString = inventory.map(i => `- ${i.name}: ${i.totalQuantity} ${i.unit}`).join('\n');
        const personalDetailsString = JSON.stringify(personalDetails, null, 2);

        const result = await generateShoppingSuggestions({
            inventory: inventoryString,
            personalDetails: personalDetailsString,
            consumptionHistory: consumptionHistory || "No consumption history available.",
        });

        if ("suggestions" in result) {
            setAiSuggestions(result.suggestions);
        } else {
            toast({
                variant: 'destructive',
                title: 'AI Error',
                description: result.error || 'Failed to get suggestions.',
            })
        }
    })
  };

  const onAddItem: SubmitHandler<AddItemForm> = async (data) => {
    if (data.item.trim() === "") return;
    const newItem = { item: data.item, quantity: "1", checked: false, reason: "Manually added" };
    
    const addedItem = await addClientShoppingListItem(newItem);
    setMyShoppingList(prev => [...prev, addedItem]);
    reset();
  };
  
  const handleRemoveClick = (item: ShoppingListItem) => {
    setItemToRemove(item);
    setIsRemoveConfirmOpen(true);
  };
  
  const handleConfirmRemove = async () => {
    if (itemToRemove) {
      await removeClientShoppingListItem(itemToRemove.id);
      setMyShoppingList(prev => prev.filter(item => item.id !== itemToRemove!.id));
    }
    setIsRemoveConfirmOpen(false);
    setItemToRemove(null);
  }

  const handleToggleCheck = async (id: string) => {
    const itemToToggle = myShoppingList.find(item => item.id === id);
    if (!itemToToggle) return;

    const updatedItem = { ...itemToToggle, checked: !itemToToggle.checked };
    setMyShoppingList(prev => prev.map(item => item.id === id ? updatedItem : item));
    
    await updateClientShoppingListItem(updatedItem);
  };

  const handleConfirmAdd = async () => {
    if (itemToAdd) {
        const newItem = { ...itemToAdd, checked: false };
        const addedItem = await addClientShoppingListItem(newItem);
        setMyShoppingList(prev => [...prev, addedItem]);
    }
    setIsConfirmOpen(false);
    setItemToAdd(null);
  }

  const handleSuggestionClick = (item: Omit<ShoppingListItem, 'id' | 'addedAt' | 'checked'>) => {
    setItemToAdd(item);
    setIsConfirmOpen(true);
  }

  const handlePurchaseComplete = async () => {
    await removeClientCheckedShoppingListItems();
    setMyShoppingList(prev => prev.filter(item => !item.checked));
    setIsBuyModalOpen(false);
    toast({ title: "Purchase Complete", description: "Checked items have been removed from your list."})
  }

  const handleThresholdsUpdate = (itemId: string, newThreshold: number | null) => {
    setInventory(prev => prev.map(item => 
        item.id === itemId ? { ...item, restockThreshold: newThreshold ?? undefined } : item
    ));
    toast({title: "Threshold updated", description: "Your restock list will update based on the new setting."})
  };
  

  return (
    <>
        <div className="flex items-center justify-between mb-4">
            <div>
            <h1 className="text-3xl font-bold tracking-tight">Shopping List</h1>
            <p className="text-muted-foreground">
                Manage your shopping list, get restock alerts, and ask the AI for new ideas.
            </p>
            </div>
             <Button variant="outline" size="icon" onClick={() => setIsThresholdsOpen(true)}>
                <Settings className="h-4 w-4" />
                <span className="sr-only">Manage restock thresholds</span>
            </Button>
        </div>

        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>My Shopping List</CardTitle>
                    <CardDescription>Add items you need to buy. This list is synced with your household.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onAddItem)} className="flex items-center gap-2 mb-4">
                        <Input {...register("item")} placeholder="e.g., Olive Oil" autoComplete="off" />
                        <Button type="submit" size="icon" aria-label="Add item">
                            <PlusCircle className="h-4 w-4" />
                        </Button>
                    </form>
                    {myShoppingList.length > 0 ? (
                        <div className="space-y-2">
                            {myShoppingList.map(item => (
                                <div key={item.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50">
                                    <Checkbox id={`check-${item.id}`} checked={!!item.checked} onCheckedChange={() => handleToggleCheck(item.id)} />
                                    <label htmlFor={`check-${item.id}`} className={`flex-1 ${item.checked ? 'line-through text-muted-foreground' : ''}`}>
                                        {item.item}
                                    </label>
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveClick(item)} aria-label="Remove item">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-sm text-center py-4">Your list is empty.</p>
                    )}
                </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Items to Restock</CardTitle>
                <CardDescription>These items are running low based on your thresholds. Click to add them to your list.</CardDescription>
              </CardHeader>
              <CardContent>
                  {lowOnStockItems.length > 0 ? (
                      <Table>
                          <TableHeader>
                              <TableRow>
                              <TableHead>Item</TableHead>
                              <TableHead>Remaining</TableHead>
                              <TableHead>Threshold</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {lowOnStockItems.map(item => (
                              <TableRow key={item.id} onClick={() => handleSuggestionClick({ item: item.name, quantity: `1 package`, reason: "Restock"})} className="cursor-pointer">
                                  <TableCell className="font-medium">{item.name}</TableCell>
                                  <TableCell>{item.totalQuantity.toFixed(2)}{item.unit}</TableCell>
                                  <TableCell>{item.restockThreshold ? `${item.restockThreshold} ${item.unit}` : "< 25%"}</TableCell>
                              </TableRow>
                              ))}
                          </TableBody>
                      </Table>
                  ) : (
                      <p className="text-muted-foreground text-sm">Your inventory is well-stocked!</p>
                  )}
              </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>AI Suggestions</CardTitle>
                    <CardDescription>Get smart recommendations based on your eating habits and inventory.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleGenerateAISuggestions} disabled={isAiPending}>
                        {isAiPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Ask AI for Recommendations
                    </Button>
                    {isAiPending && (
                        <div className="mt-4 space-y-2">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    )}
                    {aiSuggestions.length > 0 && (
                        <div className="mt-4 space-y-2">
                            {aiSuggestions.map((s, i) => (
                                <div key={i} className="p-3 border rounded-md cursor-pointer hover:bg-muted/50" onClick={() => handleSuggestionClick({ item: s.item, quantity: s.quantity, reason: s.reason })}>
                                    <p className="font-semibold">{s.item} <span className="font-normal text-muted-foreground">({s.quantity})</span></p>
                                    <p className="text-sm text-muted-foreground">{s.reason}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

        </div>

        {hasCheckedItems && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2">
                <Button size="lg" onClick={() => setIsBuyModalOpen(true)}>
                    <ShoppingBag className="mr-2 h-5 w-5" />
                    Buy Checked Items
                </Button>
            </div>
        )}
    
        <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Add to your list?</AlertDialogTitle>
                <AlertDialogDescription>
                    Do you want to add "{itemToAdd?.item}" to your personal shopping list?
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setItemToAdd(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmAdd}>Add</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isRemoveConfirmOpen} onOpenChange={setIsRemoveConfirmOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently remove "{itemToRemove?.item}" from your shopping list.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setItemToRemove(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {isBuyModalOpen && (
            <BuyItemsDialog 
                isOpen={isBuyModalOpen}
                setIsOpen={setIsBuyModalOpen}
                items={checkedItems}
                onComplete={handlePurchaseComplete}
            />
        )}
        
        {isThresholdsOpen && (
            <ManageThresholdsDialog
                isOpen={isThresholdsOpen}
                setIsOpen={setIsThresholdsOpen}
                inventory={inventory}
                onThresholdsUpdate={handleThresholdsUpdate}
            />
        )}
    </>
  );
}
