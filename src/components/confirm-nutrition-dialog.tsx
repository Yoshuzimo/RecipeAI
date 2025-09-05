
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
import type { Macros } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "@/lib/utils";

const MACRO_FIELDS: (keyof Macros | keyof NonNullable<Macros['fats']>)[] = [
  'calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium', 'cholesterol',
  'saturated', 'monounsaturated', 'polyunsaturated', 'trans'
];

export function ConfirmNutritionDialog({
  isOpen,
  userMacros,
  aiMacros,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  userMacros: Partial<Macros>;
  aiMacros: Macros;
  onConfirm: (macros: Macros) => void;
  onCancel: () => void;
}) {
  const handleUseAiData = () => {
    onConfirm(aiMacros);
  };

  const handleMergeData = () => {
    const mergedMacros = { ...aiMacros, ...userMacros };
    if (userMacros.fats) {
        mergedMacros.fats = { ...aiMacros.fats, ...userMacros.fats };
    }
    onConfirm(mergedMacros);
  };
  
  const getDisplayValue = (obj: any, field: string) => {
    if (field in obj) return obj[field];
    if (obj.fats && field in obj.fats) return obj.fats[field];
    return '-';
  }

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Confirm Nutritional Information</DialogTitle>
          <DialogDescription>
            The AI's calculations differ from the values you entered. Please review and choose which version to use.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-96">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nutrient</TableHead>
                        <TableHead className="text-right">Your Input</TableHead>
                        <TableHead className="text-right">AI Calculation</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {MACRO_FIELDS.map(field => {
                        const userVal = getDisplayValue(userMacros, field);
                        const aiVal = getDisplayValue(aiMacros, field);
                        const isConflict = userVal !== '-' && aiVal !== '-' && Math.round(Number(userVal)) !== Math.round(Number(aiVal));
                        
                        return (
                            <TableRow key={field} className={cn(isConflict && "bg-amber-100/50 dark:bg-amber-900/20")}>
                                <TableCell className="font-medium capitalize">{field}</TableCell>
                                <TableCell className={cn("text-right", isConflict && "font-bold text-amber-700 dark:text-amber-400")}>
                                    {userVal !== '-' ? Number(userVal).toFixed(0) : '-'}
                                </TableCell>
                                <TableCell className={cn("text-right", isConflict && "font-bold")}>
                                    {aiVal !== '-' ? Number(aiVal).toFixed(0) : '-'}
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={handleMergeData}>Keep My Values & Fill Blanks</Button>
          <Button onClick={handleUseAiData}>Use AI's Full Data</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
