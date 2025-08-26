import * as React from "react";
import { cn } from "@/lib/utils";

export function CardGrid({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3", className)}
      {...props}
    />
  );
}
