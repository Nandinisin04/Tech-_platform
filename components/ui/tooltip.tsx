"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

const TooltipProvider = TooltipPrimitive.Provider
const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
    title?: string
    subtitle?: string
    footer?: string
    icon?: React.ReactNode
  }
>(({ sideOffset = 8, className, title, subtitle, footer, icon, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={
        "z-[9999] w-[280px] rounded-xl border bg-popover/95 backdrop-blur px-4 py-3 " +
        "text-popover-foreground shadow-xl " +
        "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out " +
        "data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 " +
        (className ?? "")
      }
      {...props}
    >
      {(title || icon) && (
        <div className="flex items-center gap-2 mb-1">
          {icon && (
            <span className="text-primary/80">{icon}</span>
          )}
          {title && <div className="text-sm font-semibold">{title}</div>}
        </div>
      )}

      {subtitle && (
        <div className="text-xs text-muted-foreground mb-2">
          {subtitle}
        </div>
      )}

      <div className="text-sm leading-snug whitespace-pre-line">
        {props.children}
      </div>


      {footer && (
        <div className="mt-2 text-[11px] text-muted-foreground border-t pt-2">
          {footer}
        </div>
      )}

      <TooltipPrimitive.Arrow className="fill-border" />
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
