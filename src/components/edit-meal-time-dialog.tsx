
"use client";

import { useEffect, useState } from "react";
import { format, parse } from "date-fns";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import type { DailyMacros } from "@/lib/types";
import { handleUpdateMealTime } from "@/app/actions";
import { Loader2 } from "lucide-react";


const formSchema = z.object({
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Please enter a valid time in HH:mm format."),
});


export function EditMealTimeDialog({
  isOpen,
  setIsOpen,
  meal,
  onTimeUpdated,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  meal: DailyMacros;
  onTimeUpdated: () => void;
}) {
    const { toast } = useToast();
    const [isPending, setIsPending] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            time: format(new Date(meal.loggedAt), "HH:mm"),
        }
    });

    useEffect(() => {
        form.reset({ time: format(new Date(meal.loggedAt), "HH:mm") });
    }, [meal, form]);


    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsPending(true);
        const result = await handleUpdateMealTime(meal.id, values.time);
        setIsPending(false);

        if (result.success) {
            toast({
                title: "Time Updated",
                description: `The time for "${meal.meal}" has been updated.`,
            });
            onTimeUpdated();
            setIsOpen(false);
        } else {
             toast({
                variant: "destructive",
                title: "Error",
                description: result.error || "Failed to update time.",
            });
        }
    }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Meal Time</DialogTitle>
          <DialogDescription>
            Change the time your <span className="font-semibold text-foreground">{meal.meal}</span> meal was logged.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                 <FormField
                    control={form.control}
                    name="time"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Time (24-hour format)</FormLabel>
                        <FormControl>
                            <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
