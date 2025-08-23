
"use client";

import { useState } from "react";
import type { PendingMeal } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmServingsDialog } from "./confirm-servings-dialog";
import { formatDistanceToNow } from "date-fns";

export function PendingMealCard({
  pendingMeal,
  onConfirm,
}: {
  pendingMeal: PendingMeal;
  onConfirm: () => void;
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{pendingMeal.recipe.title}</CardTitle>
          <CardDescription>
            Shared by {pendingMeal.cookName} about {formatDistanceToNow(new Date(pendingMeal.createdAt), { addSuffix: true })}.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button className="w-full" onClick={() => setIsDialogOpen(true)}>
            Confirm My Servings
          </Button>
        </CardFooter>
      </Card>
      <ConfirmServingsDialog
        isOpen={isDialogOpen}
        setIsOpen={setIsDialogOpen}
        pendingMeal={pendingMeal}
        onConfirm={onConfirm}
      />
    </>
  );
}
