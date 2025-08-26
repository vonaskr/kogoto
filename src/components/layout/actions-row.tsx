import * as React from "react";
import { cn } from "@/lib/utils";

export function ActionsRow({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col sm:flex-row gap-3 [&>*]:flex-1", className)}
  {...props} />;
}
