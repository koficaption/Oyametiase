"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function ConfirmForm({
  action,
  title,
  description,
  confirmLabel = "Confirm",
  triggerLabel,
  hiddenFields,
  variant = "destructive",
}: {
  action: (formData: FormData) => Promise<unknown>;
  title: string;
  description: string;
  confirmLabel?: string;
  triggerLabel: string;
  hiddenFields?: Record<string, string>;
  variant?: "destructive" | "outline";
}) {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant={variant} size="sm">
          {triggerLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <form
            action={async (formData) => {
              await action(formData);
              setOpen(false);
            }}
          >
            {Object.entries(hiddenFields ?? {}).map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={value} />
            ))}
            <AlertDialogAction type="submit">{confirmLabel}</AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
