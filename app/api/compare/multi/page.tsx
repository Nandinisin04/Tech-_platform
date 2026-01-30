"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { InvestmentBarChart } from "@/components/compare/investment-bar-chart"
import { MultiTechLineChart } from "@/components/compare/MultiLineChart"
import { MultiTechMarketDistribution } from "@/components/compare/MultiTechMarketDistribution"


/* ================= TYPES ================= */

type MetricType = "trend" | "market" | "patents" | "investment"
type TechDataMap = Record<string, any>

/* ================= NORMALIZERS ================= */

function normalizeCurve(dataMap: TechDataMap, key: string) {
  const yearSet = new Set<number>()
  const perTech: Record<string, Record<number, number>> = {}

  Object.entries(dataMap).forEach(([tech, data]) => {
    const raw =
      key.includes(".")
        ? key.split(".").reduce((o: any, k) => o?.[k], data)
        : data?.[key]

    if (!Array.isArray(raw)) return

    perTech[tech] = {}

    raw.forEach((v: any, i: number) => {
      // CASE 1: { year, value }
      if (typeof v === "object" && typeof v.year === "number") {
        yearSet.add(v.year)
        perTech[tech][v.year] = v.value ?? v.count ?? 0
      }

      // CASE 2: plain number[] → infer year
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
    const timeline = data?.patent_timeline ?? []

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
    const values = data?.country_investment?.values ?? {}

    Object.entries(values).forEach(([country, value]: any) => {
      const c =
        country.toLowerCase().includes("united") ||
        country.toLowerCase() === "usa"
          ? "USA"
          : country

      if (!countryMap[c]) countryMap[c] = { country: c }
      countryMap[c][tech] = value
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
    // 🔥 FIX: handle all possible nesting
    const reports =
      data?.market_reports ??
      data?.dashboard?.market_reports ??
      data?.entities?.market_reports ??
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

    console.log("MARKET:", tech, points) // KEEP THIS

    result.push({ tech, points })
  })

  console.log("FINAL MARKET DATA", result)
  return result
}


/* ================= PAGE ================= */

export default function MultiComparePage() {
  const baseTech = useSearchParams().get("base")?.toLowerCase() || "ai"

  const [techs, setTechs] = useState<string[]>([baseTech])
  const [dataMap, setDataMap] = useState<TechDataMap>({})
  const [metric, setMetric] = useState<MetricType>("trend")
  const [input, setInput] = useState("")

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

      setDataMap((p) => ({
        ...p,
        [tech]: json.dashboard ?? json.data ?? json,
      }))
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

        const hasMarketPoints =
        metric === "market" &&
        Array.isArray(chartData) &&
        chartData.some(
            (t: any) => Array.isArray(t.points) && t.points.length > 0
        )



  /* ================= UI ================= */

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Multi-Tech Trend Comparison
        </h1>

        
      </div>


      <input
        value={input}
        placeholder="Add technology (press Enter)"
        className="border px-4 py-2 rounded-md w-full max-w-lg"
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && input.trim()) {
            const t = input.toLowerCase()
            if (!techs.includes(t)) setTechs([...techs, t])
            setInput("")
          }
        }}
      />

      <div className="flex gap-2 flex-wrap">
        {techs.map((t) => (
          <span key={t} className="px-3 py-1 bg-blue-100 rounded-full">
            {t}
          </span>
        ))}
      </div>

      <select
        value={metric}
        onChange={(e) => setMetric(e.target.value as MetricType)}
        className="border px-3 py-2 rounded-md w-64"
      >
        <option value="trend">Adoption Trend</option>
        <option value="market">Market Forecast</option>
        <option value="patents">Patent Activity</option>
        <option value="investment">Investment Index</option>
      </select>

       {!chartData ||
            chartData.length === 0 ||
            (metric === "market" && !hasMarketPoints) ? (
            <p className="text-muted-foreground">
                No market forecast data available for selected technologies.
            </p>
            ) : metric === "investment" ? (
            <InvestmentBarChart
                data={chartData! as ReturnType<typeof normalizeInvestmentBars>}
            />
            ) : metric === "market" ? (
            <MultiTechMarketDistribution
                data={chartData! as ReturnType<typeof normalizeMarketDistribution>}
            />
            ) : (
            <MultiTechLineChart
                data={chartData! as ReturnType<typeof normalizeCurve>}
                title={metric === "trend" ? "Adoption Trend" : "Patent Activity"}
                yLabel={metric === "trend" ? "Adoption Index" : "Patent Count"}
            />
            )}


    </div>
  )
}