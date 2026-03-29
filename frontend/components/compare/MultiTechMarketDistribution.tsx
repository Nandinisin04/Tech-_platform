"use client"

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts"

type MarketPoint = {
  value: number
  title?: string
  source?: string
}

type TechMarketData = {
  tech: string
  points: MarketPoint[]
}
const COLOR_PALETTE = [
  "#2563eb", // blue
  "#16a34a", // green
  "#dc2626", // red
  "#9333ea", // purple
  "#ea580c", // orange
  "#0d9488", // teal
  "#4f46e5", // indigo
  "#be123c", // rose
]

export function MultiTechMarketDistribution({
  data,
}: {
  data: TechMarketData[]
}) {
  if (!data.length) return null

  return (
    <div className="h-[420px] w-full rounded-xl border p-4">
<ResponsiveContainer width="100%" height={400}>
  <ScatterChart>
    <CartesianGrid strokeDasharray="3 3" />

    <XAxis type="number" dataKey="x" hide />

    <YAxis
      type="number"
      dataKey="value"
      label={{
        value: "Market Size (USD B)",
        angle: -90,
        position: "insideLeft",
      }}
    />

    <Tooltip
  content={({ payload }) => {
    if (!payload || payload.length === 0) return null

    const p = payload[0]?.payload
    const tech = String(payload[0]?.name ?? "Unknown Tech")

    const prettyTech = tech
      .replaceAll("_", " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())

    return (
      <div className="rounded-lg border border-border bg-background p-3 shadow-lg text-sm">
        <div className="font-semibold text-foreground mb-1">
          {prettyTech}
        </div>

        <div className="text-muted-foreground">
          {p?.title || "Market Data"}
        </div>

        <div className="mt-1 text-primary font-medium">
          💰 {p?.value} B USD
        </div>

        {p?.source && (
          <div className="text-xs text-muted-foreground mt-1">
            Source: {p.source}
          </div>
        )}
      </div>
    )
  }}
/>

    {data.map((techData, techIndex) => {
  const color = COLOR_PALETTE[techIndex % COLOR_PALETTE.length]

  return (
    <Scatter
      key={techData.tech}
      name={techData.tech}
      data={techData.points.map((p, i) => ({
        x: i - techData.points.length / 2,
        value: p.value,
        title: p.title,
        source: p.source,
      }))}
      fill={color}
      r={6}
    />
  )
})}
<Legend />

  </ScatterChart>
</ResponsiveContainer>



    </div>
  )
}
