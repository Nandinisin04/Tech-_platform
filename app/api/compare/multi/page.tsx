"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { InvestmentBarChart } from "@/components/compare/investment-bar-chart"
import { MultiTechLineChart } from "@/components/compare/MultiLineChart"
import { MultiTechMarketDistribution } from "@/components/compare/MultiTechMarketDistribution"
import { UnifiedKnowledgeGraph } from "@/components/knowledge-graph/UnifiedKnowledgeGraph"
import { buildUnifiedKG } from "@/lib/knowledge-graph/buildUnifiedKG"
import { ThemeToggle } from "@/components/theme-toggle"
import { BackButton } from "@/components/back-button"

/* ================= TYPES ================= */

type MetricType =
  | "trend"
  | "market"
  | "patents"
  | "investment"
  | "kg"

type TechDataMap = Record<string, any>

/* ================= NORMALIZERS ================= */

function normalizeCurve(dataMap: TechDataMap, key: string) {
  const yearSet = new Set<number>()
  const perTech: Record<string, Record<number, number>> = {}

  Object.entries(dataMap).forEach(([tech, data]) => {
    const raw =
      key.includes(".")
        ? key.split(".").reduce((o: any, k) => o?.[k], data?.dashboard)
        : data?.dashboard?.[key]

    if (!Array.isArray(raw)) return
    perTech[tech] = {}

    raw.forEach((v: any, i: number) => {
      if (typeof v === "object" && typeof v.year === "number") {
        yearSet.add(v.year)
        perTech[tech][v.year] = v.value ?? v.count ?? 0
      }
      if (typeof v === "number") {
        const year = 2020 + i
        yearSet.add(year)
        perTech[tech][year] = v
      }
    })
  })

  return Array.from(yearSet)
    .sort()
    .map((year) => {
      const row: any = { year }
      Object.keys(perTech).forEach((tech) => {
        row[tech] = perTech[tech][year] ?? null
      })
      return row
    })
}

function normalizePatentCurve(dataMap: TechDataMap) {
  const yearSet = new Set<number>()
  const perTech: Record<string, Record<number, number>> = {}

  Object.entries(dataMap).forEach(([tech, data]) => {
    perTech[tech] = {}
    const timeline = data?.dashboard?.patent_timeline ?? []

    timeline.forEach((p: any) => {
      if (typeof p.year === "number") {
        yearSet.add(p.year)
        perTech[tech][p.year] =
          (perTech[tech][p.year] ?? 0) + (p.count ?? 1)
      }
    })
  })

  return Array.from(yearSet)
    .sort()
    .map((year) => {
      const row: any = { year }
      Object.keys(perTech).forEach((tech) => {
        row[tech] = perTech[tech][year] ?? 0
      })
      return row
    })
}

function normalizeInvestmentBars(dataMap: TechDataMap) {
  const countryMap: Record<string, any> = {}

  Object.entries(dataMap).forEach(([tech, data]) => {
    const values =
      data?.dashboard?.values ??
      data?.dashboard?.country_investment?.values ??
      {}

    Object.entries(values).forEach(([country, value]: any) => {
      const c =
        country.toLowerCase().includes("united") ||
        country.toLowerCase() === "usa"
          ? "USA"
          : country

      if (!countryMap[c]) countryMap[c] = { country: c }
      countryMap[c][tech] = value ?? 0
    })
  })

  return Object.values(countryMap)
}

function parseMarketSizeToBillion(raw?: string): number | null {
  if (!raw) return null
  const s = raw.toLowerCase().replace(/[$,]/g, "").trim()
  const num = parseFloat(s)
  if (isNaN(num)) return null
  if (s.includes("trillion")) return num * 1000
  if (s.includes("billion")) return num
  if (s.includes("million")) return num / 1000
  return null
}

function normalizeMarketDistribution(dataMap: TechDataMap) {
  const result: { tech: string; points: any[] }[] = []

  Object.entries(dataMap).forEach(([tech, data]) => {
    const reports =
      data?.dashboard?.market_reports ??
      data?.dashboard?.entities?.market_reports ??
      []

    const points: any[] = []

    reports.forEach((r: any) => {
      const value = parseMarketSizeToBillion(r.market_size)
      if (value === null) return
      points.push({
        value,
        title: r.title,
        source: r.source ?? "Market Report",
      })
    })

    result.push({ tech, points })
  })

  return result
}

/* ================= PAGE ================= */

export default function MultiComparePage() {
  const baseTech = useSearchParams().get("base")?.toLowerCase() || "ai"

  const [techs, setTechs] = useState<string[]>([baseTech])
  const [dataMap, setDataMap] = useState<TechDataMap>({})
  const [metric, setMetric] = useState<MetricType>("trend")
  const [input, setInput] = useState("")

  const removeTech = (tech: string) => {
    setTechs((prev) => prev.filter((t) => t !== tech))
    setDataMap((prev) => {
      const copy = { ...prev }
      delete copy[tech]
      return copy
    })
  }

  /* ---------- FETCH ---------- */
  useEffect(() => {
    techs.forEach(async (tech) => {
      if (dataMap[tech]) return

      let res = await fetch(`/api/tech/${tech}`)
      if (res.status === 404) {
        await fetch(`/api/tech/${tech}/run`, { method: "POST" })
        res = await fetch(`/api/tech/${tech}`)
      }
      if (!res.ok) return
      const json = await res.json()

      setDataMap((p) => ({ ...p, [tech]: json }))
    })
  }, [techs])

  const chartData = useMemo(() => {
    if (techs.length < 2) return null
    switch (metric) {
      case "trend":
        return normalizeCurve(dataMap, "trend_curve")
      case "patents":
        return normalizePatentCurve(dataMap)
      case "investment":
        return normalizeInvestmentBars(dataMap)
      case "market":
        return normalizeMarketDistribution(dataMap)
    }
  }, [dataMap, metric, techs.length])

  const unifiedKG = useMemo(() => {
    const inputs = Object.entries(dataMap)
      .map(([tech, data]) =>
        data?.knowledge_graph ? { tech, kg: data.knowledge_graph } : null
      )
      .filter(Boolean) as { tech: string; kg: any }[]

    if (inputs.length === 0) return null
    return buildUnifiedKG(inputs)
  }, [dataMap])

  const hasMarketPoints =
    metric === "market" &&
    Array.isArray(chartData) &&
    chartData.some(
      (t: any) => Array.isArray(t.points) && t.points.length > 0
    )

  /* ================= UI ================= */

  return (
    <div className="w-full">
      {/* ================= TOP HEADER ================= */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center gap-6">
          <div className="flex items-center gap-3 shrink-0">
            <BackButton />
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">TechIntel</h1>
              <span className="text-muted-foreground">·</span>
              <span className="text-sm font-medium text-muted-foreground">
                Multi-Trend Comparison
              </span>
            </div>
          </div>

          <div className="flex-1 flex justify-center">
            <input
              value={input}
              placeholder="Add technology (press Enter)"
              className="border px-4 py-2 rounded-md w-full max-w-md bg-background"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && input.trim()) {
                  const t = input.toLowerCase()
                  if (!techs.includes(t)) setTechs([...techs, t])
                  setInput("")
                }
              }}
            />
          </div>

          <ThemeToggle />
        </div>
      </header>

      {/* ================= PAGE CONTENT ================= */}
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* CONTROL BAR */}
        <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 px-4 py-3">
          <div className="flex gap-1">
            {[
              { id: "trend", label: "Adoption Trend" },
              { id: "market", label: "Market Size" },
              { id: "patents", label: "Patent Activity" },
              { id: "investment", label: "Investment Index" },
              { id: "kg", label: "Knowledge Graph" },
            ].map((opt) => {
              const active = metric === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => setMetric(opt.id as MetricType)}
                  className={[
                    "px-3 py-1.5 text-sm rounded-md transition",
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            {techs.map((t) => (
              <div
                key={t}
                className="flex items-center gap-2 px-3 py-1 bg-background rounded-full text-sm border"
              >
                <span>{t}</span>
                {techs.length > 1 && (
                  <button
                    onClick={() => removeTech(t)}
                    className="text-muted-foreground hover:text-destructive font-bold"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* VISUALIZATIONS */}
        {metric === "kg" ? (
          unifiedKG ? (
            <div className="space-y-4">
              <p className="text-sm text-foreground">
                Shared patents, papers, companies, and entities across selected technologies
              </p>
              <UnifiedKnowledgeGraph
                nodes={unifiedKG.nodes}
                edges={unifiedKG.edges}
              />
            </div>
          ) : (
            <p className="text-muted-foreground">
              Knowledge graph data not available for selected technologies.
            </p>
          )
        ) : !chartData ||
          chartData.length === 0 ||
          (metric === "market" && !hasMarketPoints) ? (
          <p className="text-muted-foreground">
            No data available for selected technologies.
          </p>
        ) : metric === "investment" ? (
          <InvestmentBarChart
            data={chartData as ReturnType<typeof normalizeInvestmentBars>}
          />
        ) : metric === "market" ? (
          <MultiTechMarketDistribution
            data={chartData as ReturnType<typeof normalizeMarketDistribution>}
          />
        ) : (
          <MultiTechLineChart
            data={chartData as ReturnType<typeof normalizeCurve>}
            title={metric === "trend" ? "Adoption Trend" : "Patent Activity"}
            yLabel={metric === "trend" ? "Adoption Index" : "Patent Count"}
          />
        )}
      </main>
    </div>
  )
}