"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

export const Dialog       = DialogPrimitive.Root;
export const DialogTrigger= DialogPrimitive.Trigger;
export const DialogClose  = DialogPrimitive.Close;

export function DialogContent(
  { className, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 bg-black/40" />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2",
          "rounded-[var(--radius-lg)] border-4 border-[var(--border-strong)]",
          "bg-[var(--card)] p-6 shadow-[var(--shadow-strong)]",
          className
        )}
        {...props}
      />
    </DialogPrimitive.Portal>
  );
}
