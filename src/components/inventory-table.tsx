
"use client";

import type { InventoryItemGroup } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

function getItemStatus(expiryDate: Date | null): {
  label: "Expired" | "Expiring Soon" | "Fresh";
  className: string;
} {
  if (!expiryDate) {
    return { label: "Fresh", className: "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300 border-gray-200 dark:border-gray-900/80" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: "Expired", className: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-200 dark:border-red-900/80" };
  }
  if (diffDays <= 3) {
    return {
      label: "Expiring Soon",
      className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-200 dark:border-yellow-900/80",
    };
  }
  return { label: "Fresh", className: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-200 dark:border-green-900/80" };
}

export function InventoryTable({ data, onRowClick }: { data: InventoryItemGroup[], onRowClick: (group: InventoryItemGroup) => void }) {

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Packages</TableHead>
            <TableHead>Next Expiry</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((group) => {
              const status = getItemStatus(group.nextExpiry);
              return (
                <TableRow key={group.name} onClick={() => onRowClick(group)} className="cursor-pointer">
                  <TableCell className="font-medium">{group.name}</TableCell>
                  <TableCell>
                    {group.packageInfo}
                  </TableCell>
                  <TableCell>{group.nextExpiry ? format(group.nextExpiry, "PPP") : 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("capitalize", status.className)}>
                      {status.label}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                No items in inventory.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
