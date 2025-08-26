import * as React from "react";
import { cn } from "@/lib/utils";

// components/layout/actions-row.tsx
export function ActionsRow({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row gap-3 items-stretch",
        "[&>*]:flex-1 [&>*]:min-w-0 [&>*]:shrink", // ← これで子ボタンが“縮む”
        className
      )}
      {...props}
    />
  );
}

