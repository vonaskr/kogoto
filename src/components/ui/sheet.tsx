"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

type Side = "left" | "right" | "top" | "bottom";

export function SheetContent(
  { side = "right", className, ...props }:
    { side?: Side } & React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
) {
  const position =
    side === "right" ? "right-0 top-0 h-full w-[90vw] max-w-md translate-x-0" :
      side === "left" ? "left-0 top-0 h-full w-[90vw] max-w-md" :
        side === "top" ? "top-0 left-1/2 -translate-x-1/2 w-screen max-w-none" :
          "bottom-0 left-1/2 -translate-x-1/2 w-screen max-w-none";

  const translate =
    side === "right" ? "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right" :
      side === "left" ? "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left" :
        side === "top" ? "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top" :
          "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom";

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 bg-black/40" />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 border-4 border-[var(--border-strong)] bg-[var(--card)] p-6 shadow-[var(--shadow-strong)]",
          "rounded-[var(--radius-lg)]",
          position, translate,
          className
        )}
        {...props}
      />
    </DialogPrimitive.Portal>
  );
}
