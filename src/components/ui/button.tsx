// components/ui/button.tsx
"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";     // ← これを使う
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center font-semibold transition-colors " +
  "border-4 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
  "disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary: "bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--border-strong)]",
        surface: "bg-[var(--card)] text-[var(--foreground)] border-[var(--border-strong)]",
        accent:  "bg-[var(--accent)] text-[var(--foreground)] border-[var(--border-strong)]",
        ghost: "bg-transparent border-transparent text-[var(--foreground)]",
      },
      size: { sm: "h-8 px-3 text-sm", md: "h-10 px-4 text-base", lg: "h-12 px-6 text-lg" },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
    
  }
);

type ButtonBaseProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean; // ← 追加
  };

function Button({ className, variant, size, block, asChild, ...props }: ButtonBaseProps) {
  // asChild が true なら <Slot> を返す（中の子をそのまま採用）
  const Comp: any = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, block}),"whitespace-normal break-words text-center",className)} {...props} />;
}

export { Button, buttonVariants };
