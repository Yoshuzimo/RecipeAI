"use client";

import { useState, useTransition } from "react";
import type { InventoryItem } from "@/lib/types";
import { handleGenerateShoppingList } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Sparkles, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Skeleton } from "./ui/skeleton";

type ShoppingListItem = {
    item: string;
    quantity: string;
    reason: string;
};

export function ShoppingList({ inventory, personalDetails }: { inventory: InventoryItem[], personalDetails: any }) {
  const [isPending, startTransition] = useTransition();
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lowOnStockItems = inventory.filter(item => item.quantity < 2 && item.unit === 'pcs' || item.quantity < 200 && (item.unit === 'g' || item.unit === 'ml'));

  const handleGenerate = () => {
    startTransition(async () => {
      setError(null);
      const result = await handleGenerateShoppingList(inventory, personalDetails);
      if (result.error) {
        setError(result.error);
        setShoppingList(null);
      } else {
        setShoppingList(result.shoppingList);
      }
    });
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Items to Restock</CardTitle>
          <CardDescription>These items are running low in your inventory.</CardDescription>
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
                        <TableRow key={item.id}>
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

      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <CardTitle>AI Shopping Guide</CardTitle>
                    <CardDescription>Get smart recommendations for your next shopping trip.</CardDescription>
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
            ) : shoppingList ? (
                 <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Reason</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {shoppingList.map((item, index) => (
                        <TableRow key={index}>
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
    </div>
  );
}
