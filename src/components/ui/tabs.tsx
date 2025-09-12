// components/ui/tabs.tsx
"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

// そのまま再エクスポート（Rootは直接使う）
const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(function TabsList({ className, ...props }, ref) {
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        "flex overflow-hidden border-4 rounded-[var(--radius-lg)] border-[var(--border-strong)]",
        className
      )}
      {...props}
    />
  );
});

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(function TabsTrigger({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        // data-state は Radix が自動で付ける。active 状態のスタイルはここで切替。
        "flex-1 py-2 text-sm font-semibold border-r-4 last:border-r-0 border-[var(--border-strong)]",
        "data-[state=active]:bg-[var(--primary)] data-[state=active]:text-[var(--primary-foreground)]",
        "data-[state=inactive]:bg-[var(--card)] data-[state=inactive]:text-[var(--foreground)]",
        className
      )}
      {...props}
    />
  );
});

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(function TabsContent({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Content
      ref={ref}
      className={cn(
        "p-4 border-4 border-t-0 rounded-b-[var(--radius-lg)] border-[var(--border-strong)]",
        className
      )}
      {...props}
    />
  );
});

export { Tabs, TabsList, TabsTrigger, TabsContent };