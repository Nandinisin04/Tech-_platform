"use client"

import React from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Info } from "lucide-react"

export function HoverTip({
  tip,
  title,
  subtitle,
  footer,
  showIcon = false,
  children,
}: {
  tip: string
  title?: string
  subtitle?: string
  footer?: string
  showIcon?: boolean
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1">
          {children}
          {showIcon && (
            <Info className="w-3.5 h-3.5 text-muted-foreground/60" />
          )}
        </span>
      </TooltipTrigger>

      <TooltipContent title={title} subtitle={subtitle} footer={footer}>
        {tip}
      </TooltipContent>
    </Tooltip>
  )
}
