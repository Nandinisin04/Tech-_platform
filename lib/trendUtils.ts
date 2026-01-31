// src/lib/trendUtils.ts

export function makeTrendData(trend_curve: number[]) {
  return (trend_curve ?? []).map((v, i) => ({
    step: `T${i + 1}`,
    value: v,
    index: i,
  }))
}
