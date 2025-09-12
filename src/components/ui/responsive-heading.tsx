import * as React from "react";
import { cn } from "@/lib/utils";

export function H1({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn("font-extrabold tracking-tight text-[clamp(1.75rem,5vw,2.5rem)]", className)}
      {...props}
    />
  );
}