// components/ui/progress.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

type Props = React.HTMLAttributes<HTMLDivElement> & { value?: number }

function Progress({ value = 0, className, ...props }: Props) {
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "h-3 w-full overflow-hidden rounded-[var(--radius-lg)] border-4 border-[var(--border-strong)]",
        "bg-[var(--card)]",
        className
      )}
      {...props}
    >
      <div
        className="h-full"
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          background: "var(--primary)",
        }}
      />
    </div>
  )
}

export { Progress }
