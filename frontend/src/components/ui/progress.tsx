"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cn } from "@/lib/utils"

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  indicatorClassName?: string
  variant?: "default" | "gradient" | "success" | "indeterminate"
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, indicatorClassName, variant = "default", ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-secondary/50",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(
        "h-full w-full flex-1 rounded-full transition-all duration-500 ease-out",
        variant === "gradient" && "bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-400 animate-progress-gradient",
        variant === "success" && "bg-gradient-to-r from-emerald-500 to-green-400",
        variant === "indeterminate" && "bg-gradient-to-r from-transparent via-primary to-transparent animate-shimmer bg-[length:200%_100%]",
        variant === "default" && "bg-primary",
        indicatorClassName
      )}
      style={{ transform: variant === "indeterminate" ? undefined : `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }