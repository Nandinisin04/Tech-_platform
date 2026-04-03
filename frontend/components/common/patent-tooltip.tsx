"use client"

export function PatentTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null

  const point = payload[0]?.payload
  if (!point) return null

  return (
    <div className="w-[260px] rounded-xl border bg-popover/95 backdrop-blur px-4 py-3 shadow-xl">
      <div className="text-sm font-semibold">{label ?? point.year}</div>

      <div className="mt-1 text-xs text-muted-foreground">
        Patents Filed:{" "}
        <span className="font-medium text-foreground">
          {point.count ?? 0}
        </span>
      </div>

      <div className="mt-3">
        <div className="text-xs font-medium mb-2">Countries</div>

        {point.countries && point.countries.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {point.countries.map((country: string, idx: number) => (
              <span
                key={idx}
                className="rounded-full border px-2 py-[2px] text-[11px]"
              >
                {country}
              </span>
            ))}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            No country data available
          </div>
        )}
      </div>
    </div>
  )
}