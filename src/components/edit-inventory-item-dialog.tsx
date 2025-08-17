
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { updateInventoryItem, removeInventoryItem } from "@/lib/data";
import { Button } from "@/components/ui/button";
import {
  DialogClose,
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
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Trash2 } from "lucide-react";
import { Calendar } from "./ui/calendar";
import { Progress } from "./ui/progress";
import { Label } from "./ui/label";

const formSchema = z.object({
  totalQuantity: z.coerce.number().gte(0, {
    message: "Quantity must be zero or more.",
  }),
  expiryDate: z.date({
    required_error: "An expiry date is required.",
  }),
});

export function EditInventoryItemDialog({
  item,
  onItemUpdated,
  onItemRemoved,
}: {
  item: InventoryItem;
  onItemUpdated: (item: InventoryItem) => void;
  onItemRemoved: (itemId: string) => void;
}) {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    values: {
      totalQuantity: item.totalQuantity,
      expiryDate: new Date(item.expiryDate),
    },
  });
  
  async function onEditSubmit(values: z.infer<typeof formSchema>) {
    // If the count is 0, treat it as a removal
    if (values.totalQuantity <= 0) {
        onRemove();
        return;
    }
    
    try {
      const updatedItem = await updateInventoryItem({
        ...item,
        totalQuantity: values.totalQuantity,
        expiryDate: values.expiryDate
      });
      onItemUpdated(updatedItem);
      toast({
        title: "Item Updated",
        description: `${updatedItem.name} has been updated.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update item. Please try again.",
      });
    }
  }
  
  async function onRemove() {
    try {
        await removeInventoryItem(item.id);
        onItemRemoved(item.id);
        toast({
            title: "Item Removed",
            description: `${item.name} has been removed from inventory.`,
        });
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to remove item. Please try again.",
        });
    }
  }

  const percentage = (item.totalQuantity / item.originalQuantity) * 100;

  return (
    <Form {...form}>
    <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4 rounded-lg border p-4">
         <div>
            <Label>Package Fill Level ({item.originalQuantity} {item.unit})</Label>
            <Progress value={percentage} className="mt-2"/>
            <p className="text-sm text-muted-foreground mt-1">{`~${percentage.toFixed(0)}% full (${item.totalQuantity.toFixed(2)} / ${item.originalQuantity} ${item.unit})`}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
             <FormField
                control={form.control}
                name="totalQuantity"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Remaining Quantity ({item.unit})</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} step="0.1" />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="expiryDate"
                render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Expiry Date</FormLabel>
                    <Popover>
                    <PopoverTrigger asChild>
                        <FormControl>
                        <Button
                            variant={"outline"}
                            className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                            )}
                        >
                            {field.value ? (
                            format(field.value, "PPP")
                            ) : (
                            <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                        </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        />
                    </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>
       
        <div className="flex justify-between items-center">
            <Button size="icon" type="button" variant="destructive" onClick={onRemove}>
                <Trash2 className="h-4 w-4" />
            </Button>
            <div className="flex gap-2">
                <DialogClose asChild>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? "Saving..." : "Save"}
                    </Button>
                </DialogClose>
            </div>
        </div>
    </form>
    </Form>
  );
}
