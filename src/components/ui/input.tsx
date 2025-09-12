// components/ui/input.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "border-4 rounded-lg px-3 py-2 text-base",
        "bg-[var(--background)] text-[var(--foreground)]",
        "border-[var(--border-strong)]",
        "focus:outline-none focus:ring-2 focus:ring-[var(--accent)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
