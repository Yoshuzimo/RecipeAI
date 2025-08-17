
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { updateInventoryItem, removeInventoryItem } from "@/lib/data";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { InventoryItem } from "@/lib/types";
import { useState } from "react";
import { Separator } from "./ui/separator";

const formSchema = z.object({
  quantity: z.coerce.number().positive({
    message: "Quantity must be a positive number.",
  }),
});

const spoilageSchema = z.object({
    amount: z.coerce.number().min(0, { message: "Amount must be a positive number."}),
});

export function EditInventoryItemDialog({
  isOpen,
  setIsOpen,
  item,
  onItemUpdated,
  onItemRemoved,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  item: InventoryItem;
  onItemUpdated: (item: InventoryItem) => void;
  onItemRemoved: (itemId: string) => void;
}) {
  const { toast } = useToast();
  const [showSpoilageForm, setShowSpoilageForm] = useState(false);
  const isExpired = new Date(item.expiryDate) < new Date();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    values: {
      quantity: item.quantity,
    },
  });

  const spoilageForm = useForm<z.infer<typeof spoilageSchema>>({
    resolver: zodResolver(spoilageSchema),
    defaultValues: {
      amount: 0,
    }
  });


  async function onEditSubmit(values: z.infer<typeof formSchema>) {
    try {
      const updatedItem = await updateInventoryItem({
        ...item,
        quantity: values.quantity,
      });
      onItemUpdated(updatedItem);
      toast({
        title: "Item Updated",
        description: `${updatedItem.name} has been updated.`,
      });
      setIsOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update item. Please try again.",
      });
    }
  }

  async function onSpoilageSubmit(values: z.infer<typeof spoilageSchema>) {
    try {
        if (values.amount <= 0) { // "None" case
            const today = new Date();
            const updatedItem = await updateInventoryItem({ ...item, expiryDate: today });
            onItemUpdated(updatedItem);
            toast({
                title: "Item Confirmed Fresh",
                description: `${item.name}'s expiry date has been updated to today.`,
            });
        } else if (values.amount >= item.quantity) { // All of it went bad
            await removeInventoryItem(item.id);
            onItemRemoved(item.id);
            toast({
                title: "Item Removed",
                description: `${item.name} has been removed from inventory.`,
            });
        } else { // Some of it went bad
            const updatedItem = await updateInventoryItem({ ...item, quantity: item.quantity - values.amount });
            onItemUpdated(updatedItem);
            toast({
                title: "Inventory Updated",
                description: `${values.amount} ${item.unit} of ${item.name} reported as spoiled and removed.`,
            });
        }
        setIsOpen(false);
    } catch(error) {
         toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to update inventory. Please try again.",
        });
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setShowSpoilageForm(false);
      form.reset();
      spoilageForm.reset();
    }
    setIsOpen(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit {item.name}</DialogTitle>
          <DialogDescription>
            Update the quantity or report spoilage.
          </DialogDescription>
        </DialogHeader>

        {!showSpoilageForm ? (
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Quantity ({item.unit})</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <Button type="button" variant="link" className="p-0 h-auto" onClick={() => setShowSpoilageForm(true)}>
                    {isExpired ? "Is this still good?" : "Has some gone bad?"}
                 </Button>
                <DialogFooter>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
                </DialogFooter>
            </form>
            </Form>
        ) : (
            <Form {...spoilageForm}>
            <form onSubmit={spoilageForm.handleSubmit(onSpoilageSubmit)} className="space-y-4">
                <h3 className="text-sm font-medium">{isExpired ? "Confirm if this item is still good" : "Report spoilage"}</h3>
                <Separator />
                <FormField
                control={spoilageForm.control}
                name="amount"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Amount spoiled ({item.unit})</FormLabel>
                    <FormControl>
                       <Input type="number" placeholder="Enter 0 if none" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <p className="text-xs text-muted-foreground">
                    Enter the amount that has gone bad. If the item is still good, enter 0 to update its expiry date to today.
                </p>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setShowSpoilageForm(false)}>Back</Button>
                    <Button type="submit" disabled={spoilageForm.formState.isSubmitting}>
                        {spoilageForm.formState.isSubmitting ? "Confirming..." : "Confirm"}
                    </Button>
                </DialogFooter>
            </form>
            </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
