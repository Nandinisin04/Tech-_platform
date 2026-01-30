"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

import { DashboardHeader } from "@/components/dashboard-header"
import { KeyInsightsCards } from "@/components/key-insights-cards"
import { VisualizationArea } from "@/components/visualization-area"
import { SidebarPanels } from "@/components/sidebar-panels"

function DashboardContent() {
  const searchParams = useSearchParams()
  const techParam = searchParams.get("tech") || "hypersonics"
  const techName = techParam.toLowerCase()

  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setError(null)
    setData(null)

    fetch(`/api/tech/${encodeURIComponent(techName)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Technology data not available")
        return res.json()
      })
      .then((json) => setData(json))
      .catch(() => setError("Technology data not available"))
  }, [techName])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading analysis data...</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-primary">
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </Link>
          <h1 className="text-2xl font-bold">TechIntel</h1>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <DashboardHeader techName={decodeURIComponent(techName)} />

        {/* Key Insights */}
        <div className="mb-8">
          <KeyInsightsCards insights={data.summary} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Visuals */}
          <div className="lg:col-span-2">
            <VisualizationArea
              trendCurve={data.trend_curve ?? []}
              countryInvestment={data.country_investment.values ?? []}
              patentTimeline={data.patent_timeline ?? []}
            />
          </div>

          {/* Sidebar */}
          <div>
           <SidebarPanels
            alerts={data.alerts ?? []}
            companies={data.entities?.companies ?? []}
            publications={data.entities?.papers ?? []}
            patents = {data.entities?.patents ?? []}
      
          />

          </div>
        </div>
      </div>
    </main>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading dashboard...</p>}>
      <DashboardContent />
    </Suspense>
  )
}
