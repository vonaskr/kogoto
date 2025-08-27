import * as React from "react";
import { cn } from "@/lib/utils";

export function Container({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-12 py-6", className)}
      {...props}
    >
      {children}
    </div>
  );
}
