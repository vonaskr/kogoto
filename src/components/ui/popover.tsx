// components/ui/popover.tsx
"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

export function PopoverContent(
  { className, ...props }: React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        sideOffset={8}
        className={cn(
          "z-50 rounded-[var(--radius-lg)] border-4 border-[var(--border-strong)]",
          "bg-[var(--card)] p-4 shadow-[var(--shadow-strong)]",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
