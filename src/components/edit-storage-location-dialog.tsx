
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { addClientStorageLocation, updateClientStorageLocation, removeClientStorageLocation } from "@/app/actions";
import type { StorageLocation } from "@/lib/types";
import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Trash2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Location name must be at least 2 characters.",
  }),
});

export function EditStorageLocationDialog({
  isOpen,
  setIsOpen,
  location,
  onLocationUpdated,
  onLocationRemoved,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  location: StorageLocation;
  onLocationUpdated: (location: StorageLocation) => void;
  onLocationRemoved: (locationId: string) => void;
}) {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (location) {
      form.reset({ name: location.name });
    }
  }, [location, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsPending(true);
    try {
      const updatedLocation = await updateClientStorageLocation({
        ...location,
        name: values.name,
      });
      onLocationUpdated(updatedLocation);
      toast({
        title: "Location Updated",
        description: `"${updatedLocation.name}" has been updated.`,
      });
      setIsOpen(false);
    } catch (error) {
       const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setIsPending(false);
    }
  }
  
  async function onDelete() {
      setIsPending(true);
      try {
          await removeClientStorageLocation(location.id);
          onLocationRemoved(location.id);
          toast({
              title: "Location Removed",
              description: `"${location.name}" has been removed.`,
          });
          setIsConfirmDeleteOpen(false);
          setIsOpen(false);
      } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
          toast({
              variant: "destructive",
              title: "Error Removing Location",
              description: errorMessage,
          });
      } finally {
          setIsPending(false);
      }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Location</DialogTitle>
            <DialogDescription>
              Update the name of your storage location. Type is fixed.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Garage Fridge" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>Location Type</FormLabel>
                <Input value={location.type} disabled />
              </FormItem>
              <DialogFooter className="justify-between sm:justify-between">
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => setIsConfirmDeleteOpen(true)}
                  disabled={isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setIsOpen(false)}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isPending}>
                        {isPending ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. You can only remove a location if it is empty. Are you sure you want to permanently delete "{location.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
