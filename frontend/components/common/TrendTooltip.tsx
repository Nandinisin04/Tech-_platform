"use client"

import { getTrendInsight } from "@/lib/trendInsights"

export function TrendTooltip({ active, payload, label, data }: any) {
  if (!active || !payload || payload.length === 0) return null

  const value = payload[0]?.value ?? 0
  const index = payload[0]?.payload?.index ?? 0

  const { delta, tag, text } = getTrendInsight(data, index)

  return (
    <div className="w-[260px] rounded-xl border bg-popover/95 backdrop-blur px-4 py-3 shadow-xl">
      <div className="text-sm font-semibold">{label}</div>

      <div className="mt-1 text-xs text-muted-foreground">
        Adoption Trend: <span className="font-medium text-foreground">{value}</span>
      </div>

      <div className="mt-2 text-xs">
        Change:{" "}
        <span className="font-semibold">
          {delta >= 0 ? `+${delta}` : delta}
        </span>{" "}
        <span className="ml-2 rounded-full border px-2 py-[2px] text-[11px]">
          {tag}
        </span>
      </div>

      <div className="mt-2 text-xs text-muted-foreground leading-snug">
        {text}
      </div>
    </div>
  )
}
