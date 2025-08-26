// components/ui/tooltip.tsx
import * as React from "react"
import * as RTooltip from "@radix-ui/react-tooltip"
import { cn } from "@/lib/utils"

function Tooltip(props: RTooltip.TooltipProps) {
  return <RTooltip.Root delayDuration={200} {...props} />
}

function TooltipTrigger(props: RTooltip.TooltipTriggerProps) {
  return <RTooltip.Trigger {...props} />
}

function TooltipContent({
  className,
  sideOffset = 6,
  ...props
}: RTooltip.TooltipContentProps & { className?: string; sideOffset?: number }) {
  return (
    <RTooltip.Content
      sideOffset={sideOffset}
      className={cn(
        "border-4 rounded-[var(--radius-lg)] px-3 py-2 text-sm",
        "bg-[var(--card)] text-[var(--foreground)] border-[var(--border-strong)]",
        "shadow-[4px_4px_0_var(--border-strong)]",
        className
      )}
      {...props}
    />
  )
}

function TooltipProvider(props: RTooltip.TooltipProviderProps) {
  return <RTooltip.Provider {...props} />
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
