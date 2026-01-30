"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

type ShowMoreProps<T> = {
  items: T[]
  initialCount?: number
  render: (item: T, index: number) => React.ReactNode
}

export function ShowMore<T>({
  items,
  initialCount = 5,
  render,
}: ShowMoreProps<T>) {
  const [expanded, setExpanded] = useState(false)

  const visibleItems = expanded
    ? items
    : items.slice(0, initialCount)

  return (
    <div className="space-y-2">
      {visibleItems.map((item, i) => (
        <div key={i}>{render(item, i)}</div>
      ))}

      {items.length > initialCount && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary flex items-center gap-1 hover:underline"
        >
          {expanded ? (
            <>
              Show less <ChevronUp className="w-3 h-3" />
            </>
          ) : (
            <>
              Show more <ChevronDown className="w-3 h-3" />
            </>
          )}
        </button>
      )}
    </div>
  )
}