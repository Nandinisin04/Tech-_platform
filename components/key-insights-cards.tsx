"use client"

import type React from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { TrendingUp, Activity, BarChart3, Zap } from "lucide-react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { HoverTip } from "@/components/common/HoverTip"

import {
  KEY_INSIGHTS_TOOLTIPS,
  STAGE_INFO,
  TRL_INFO,
  MARKET_SIZE_INFO,
  CONVERGENCE_INFO,
} from "@/lib/keyInsightsTooltips"

interface InsightCard {
  id: string
  title: string
  description: string
  metric: string
  value: string | number
  icon: React.ReactNode
  status: "increasing" | "stable" | "decreasing"
}

type KeyInsightsProps = {
  insights: {
    trl: number
    growth_stage: string
    market_size_billion_usd: number | null
    signals: number
  }
}

export function KeyInsightsCards({ insights }: KeyInsightsProps) {
  const INSIGHTS: InsightCard[] = [
    {
      id: "1",
      title: "Technology Readiness",
      description: "Current maturity level assessment",
      metric: "TRL Level",
      value: `${insights.trl}/9`,
      icon: <Activity className="w-5 h-5" />,
      status: "increasing",
    },
    {
      id: "2",
      title: "S-Curve Position",
      description: "Adoption and market penetration",
      metric: "Stage",
      value: insights.growth_stage,
      icon: <TrendingUp className="w-5 h-5" />,
      status: "increasing",
    },
    {
      id: "3",
      title: "Market Size",
      description: "Projected market value",
      metric: "TAM",
      value:
        insights.market_size_billion_usd == null
          ? "N/A"
          : `$${insights.market_size_billion_usd}B`,
      icon: <BarChart3 className="w-5 h-5" />,
      status: "increasing",
    },
    {
      id: "4",
      title: "Tech Convergence",
      description: "Related technology intersections",
      metric: "Signals",
      value: insights.signals,
      icon: <Zap className="w-5 h-5" />,
      status: "stable",
    },
  ]

  return (
    <TooltipProvider delayDuration={200}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {INSIGHTS.map((insight) => {
          const baseTip =
            KEY_INSIGHTS_TOOLTIPS[
              insight.title as keyof typeof KEY_INSIGHTS_TOOLTIPS
            ]

          // ✅ dynamic value meaning per card
          let valueMeaning = "Value meaning: —"

          if (insight.title === "Technology Readiness") {
            valueMeaning = TRL_INFO(insights.trl)
          }

          if (insight.title === "Market Size") {
            valueMeaning = MARKET_SIZE_INFO(insights.market_size_billion_usd)
          }

          if (insight.title === "Tech Convergence") {
            valueMeaning = CONVERGENCE_INFO(insights.signals)
          }

          if (insight.title === "S-Curve Position") {
            valueMeaning = `Value meaning: ${
              STAGE_INFO[insights.growth_stage] ?? "Stage meaning not available."
            }`
          }

          // ✅ final tooltip text (2 lines meaning + space + 1 line value meaning)
          const combinedTooltip = `
${baseTip?.meaning ?? "Info not available."}

${valueMeaning}
          `.trim()

          return (
            <Card
              key={insight.id}
              className="hover:border-primary/30 transition-all hover:shadow-sm"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* ✅ ONLY ONE tooltip icon per card (near title) */}
                    <CardTitle className="text-sm font-semibold flex items-center gap-1">
                      <span>{insight.title}</span>

                      <HoverTip
                        showIcon={true}
                        title={insight.title}
                        subtitle={insight.description}
                        footer="Hover for explanation"
                        tip={combinedTooltip}
                      >
                        <span />
                      </HoverTip>
                    </CardTitle>

                    <CardDescription className="text-xs mt-1">
                      {insight.description}
                    </CardDescription>
                  </div>

                  <div className="text-primary/50 flex-shrink-0">
                    {insight.icon}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-foreground">
                    {insight.value}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {insight.metric}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
