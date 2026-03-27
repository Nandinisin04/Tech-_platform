// src/lib/trendInsights.ts

export function getTrendInsight(data: any[], index: number) {
  if (!data?.length) {
    return { delta: 0, tag: "No Data", text: "No trend data available." }
  }
  if (index === 0) {
    return { delta: 0, tag: "Start", text: "Starting point of the forecast." }
  }

  const prev = Number(data[index - 1]?.value ?? 0)
  const curr = Number(data[index]?.value ?? 0)
  const delta = curr - prev

  if (delta >= 3) return { delta, tag: "Spike", text: "Sharp jump — adoption accelerating fast." }
  if (delta === 2) return { delta, tag: "Rising", text: "Strong growth — adoption increasing steadily." }
  if (delta === 1) return { delta, tag: "Slight Rise", text: "Small increase — gradual adoption rise." }
  if (delta === 0) return { delta, tag: "Stable", text: "No major change — stable phase." }
  if (delta === -1) return { delta, tag: "Slight Dip", text: "Minor dip — short slowdown." }
  return { delta, tag: "Dip", text: "Drop detected — adoption slowed after peak." }
}
