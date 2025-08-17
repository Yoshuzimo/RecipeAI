

"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import type { InventoryItem } from "@/lib/types";
import { handleGenerateShoppingList } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Sparkles, AlertCircle, PlusCircle, Trash2, Settings, ChevronDown, ChevronUp } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Skeleton } from "./ui/skeleton";
import { Input } from "./ui/input";
import { useForm, SubmitHandler } from "react-hook-form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Checkbox } from "./ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuItem } from "./ui/dropdown-menu";

type ShoppingListItem = {
    id: string;
    item: string;
    quantity: string;
    reason?: string;
    checked?: boolean;
};

type AIListItem = {
    item: string;
    quantity: string;
    reason: string;
}

type AddItemForm = {
    item: string;
};

type Section = {
  id: 'myList' | 'restock' | 'aiGuide';
  title: string;
  isVisible: boolean;
}

const initialSections: Section[] = [
    { id: 'myList', title: 'My Shopping List', isVisible: true },
    { id: 'restock', title: 'Items to Restock', isVisible: true },
    { id: 'aiGuide', title: 'AI Shopping Guide', isVisible: true },
];


export function ShoppingList({ inventory, personalDetails }: { inventory: InventoryItem[], personalDetails: any }) {
  const [isPending, startTransition] = useTransition();
  const [aiShoppingList, setAiShoppingList] = useState<AIListItem[] | null>(null);
  const [myShoppingList, setMyShoppingList] = useState<ShoppingListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [itemToAdd, setItemToAdd] = useState<Omit<ShoppingListItem, 'id' | 'checked'> | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<ShoppingListItem | null>(null);
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);
  const [sections, setSections] = useState<Section[]>(initialSections);

  useEffect(() => {
    // In a real app, you'd fetch this from a DB or local storage
    const savedList = localStorage.getItem('myShoppingList');
    if (savedList) {
      setMyShoppingList(JSON.parse(savedList));
    }
    const savedSections = localStorage.getItem('shoppingListSections');
     if (savedSections) {
      const parsedSections = JSON.parse(savedSections);
      // Ensure all sections are present, even if new ones were added to the code
      setSections(initialSections.map(s => parsedSections.find((ps: Section) => ps.id === s.id) || s));
    }
  }, []);

  const { register, handleSubmit, reset } = useForm<AddItemForm>();

  const lowOnStockItems = inventory.filter(item => item.quantity < 2 && item.unit === 'pcs' || item.quantity < 200 && (item.unit === 'g' || item.unit === 'ml'));

  const handleGenerate = () => {
    startTransition(async () => {
      setError(null);
      const result = await handleGenerateShoppingList(inventory, personalDetails);
      if (result.error) {
        setError(result.error);
        setAiShoppingList(null);
      } else {
        setAiShoppingList(result.shoppingList);
      }
    });
  };

  const onAddItem: SubmitHandler<AddItemForm> = (data) => {
    if (data.item.trim() === "") return;
    const newItem = { id: `manual-${Date.now()}`, item: data.item, quantity: "1", checked: false };
    const newList = [...myShoppingList, newItem];
    setMyShoppingList(newList);
    localStorage.setItem('myShoppingList', JSON.stringify(newList));
    reset();
  };
  
  const handleRemoveClick = (item: ShoppingListItem) => {
    setItemToRemove(item);
    setIsRemoveConfirmOpen(true);
  };
  
  const handleConfirmRemove = () => {
    if (itemToRemove) {
      const newList = myShoppingList.filter(item => item.id !== itemToRemove.id);
      setMyShoppingList(newList);
      localStorage.setItem('myShoppingList', JSON.stringify(newList));
    }
    setIsRemoveConfirmOpen(false);
    setItemToRemove(null);
  }

  const handleToggleCheck = (id: string) => {
    const newList = myShoppingList.map(item => item.id === id ? {...item, checked: !item.checked } : item);
    setMyShoppingList(newList);
    localStorage.setItem('myShoppingList', JSON.stringify(newList));
  };

  const handleConfirmAdd = () => {
    if (itemToAdd) {
        const newItem = { ...itemToAdd, id: `sugg-${Date.now()}`, checked: false };
        const newList = [...myShoppingList, newItem];
        setMyShoppingList(newList);
        localStorage.setItem('myShoppingList', JSON.stringify(newList));
    }
    setIsConfirmOpen(false);
    setItemToAdd(null);
  }

  const handleSuggestionClick = (item: Omit<ShoppingListItem, 'id' | 'checked'>) => {
    setItemToAdd(item);
    setIsConfirmOpen(true);
  }

  const updateSections = (newSections: Section[]) => {
      setSections(newSections);
      localStorage.setItem('shoppingListSections', JSON.stringify(newSections));
  };

  const toggleSectionVisibility = (sectionId: string) => {
    const newSections = sections.map(sec => 
        sec.id === sectionId ? { ...sec, isVisible: !sec.isVisible } : sec
    );
    updateSections(newSections);
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < newSections.length) {
        const [movedSection] = newSections.splice(index, 1);
        newSections.splice(newIndex, 0, movedSection);
        updateSections(newSections);
    }
  };
  
  const MyShoppingListComponent = (
    <Card>
        <CardHeader>
            <CardTitle>My Shopping List</CardTitle>
            <CardDescription>Add items you need to buy.</CardDescription>
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
                            <Checkbox id={`check-${item.id}`} checked={item.checked} onCheckedChange={() => handleToggleCheck(item.id)} />
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
  );

  const RestockComponent = (
    <Card>
      <CardHeader>
        <CardTitle>Items to Restock</CardTitle>
        <CardDescription>These items are running low in your inventory. Click to add them to your list.</CardDescription>
      </CardHeader>
      <CardContent>
          {lowOnStockItems.length > 0 ? (
              <Table>
                  <TableHeader>
                      <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Remaining Quantity</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {lowOnStockItems.map(item => (
                      <TableRow key={item.id} onClick={() => handleSuggestionClick({ item: item.name, quantity: `1 ${item.unit}`})} className="cursor-pointer">
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.quantity}{item.unit}</TableCell>
                      </TableRow>
                      ))}
                  </TableBody>
              </Table>
          ) : (
              <p className="text-muted-foreground text-sm">Your inventory is well-stocked!</p>
          )}
      </CardContent>
    </Card>
  );

  const AIGuideComponent = (
     <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <CardTitle>AI Shopping Guide</CardTitle>
                    <CardDescription>Get smart recommendations for your next shopping trip. Click to add them to your list.</CardDescription>
                </div>
                 <Button onClick={handleGenerate} disabled={isPending}>
                    {isPending ? (
                        <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                        </>
                    ) : (
                        <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate AI Shopping List
                        </>
                    )}
                </Button>
            </div>
        </CardHeader>
        <CardContent>
            {isPending ? (
                <div className="space-y-4">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                </div>
            ) : error ? (
                 <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            ) : aiShoppingList ? (
                 <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Reason</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {aiShoppingList.map((item, index) => (
                        <TableRow key={index} onClick={() => handleSuggestionClick(item)} className="cursor-pointer">
                            <TableCell className="font-medium">{item.item}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell className="text-muted-foreground">{item.reason}</TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <div className="text-center py-10 border-2 border-dashed rounded-lg">
                    <Sparkles className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">Ready for suggestions?</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Click the button to generate a personalized shopping list.
                    </p>
                </div>
            )}
        </CardContent>
      </Card>
  );

    const sectionComponents: Record<Section['id'], React.ReactNode> = {
        myList: MyShoppingListComponent,
        restock: RestockComponent,
        aiGuide: AIGuideComponent
    };

  return (
    <>
        <div className="flex justify-end mb-4">
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                        <Settings className="h-4 w-4" />
                        <span className="sr-only">Layout Settings</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {sections.map((section, index) => (
                        <DropdownMenuSub key={section.id}>
                            <DropdownMenuSubTrigger>{section.title}</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                                <DropdownMenuCheckboxItem
                                    checked={section.isVisible}
                                    onCheckedChange={() => toggleSectionVisibility(section.id)}
                                >
                                    Show Section
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => moveSection(index, 'up')} disabled={index === 0}>
                                    <ChevronUp className="mr-2 h-4 w-4" />
                                    Move Up
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => moveSection(index, 'down')} disabled={index === sections.length - 1}>
                                     <ChevronDown className="mr-2 h-4 w-4" />
                                    Move Down
                                </DropdownMenuItem>
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>

        <div className="space-y-8">
            {sections.map(section => 
                section.isVisible ? (
                    <div key={section.id}>
                        {sectionComponents[section.id]}
                    </div>
                ) : null
            )}
        </div>
    
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
    </>
  );
}
