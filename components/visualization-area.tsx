"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts"

type PatentPoint = {
  year: number
  count: number
}

type VisualizationAreaProps = {
  trendCurve?: number[]
  countryInvestment?: Record<string, number>
  patentTimeline?: PatentPoint[]
}

export function VisualizationArea({
  trendCurve = [],
  countryInvestment = {},
  patentTimeline = [],
}: VisualizationAreaProps) {
  // ---------- SAFE TRANSFORMS ----------
  const forecastData =
    trendCurve.length > 0
      ? trendCurve.map((value, index) => ({
          step: `T${index + 1}`,
          value,
        }))
      : []

  const investmentData =
    countryInvestment && Object.keys(countryInvestment).length > 0
      ? Object.entries(countryInvestment).map(([country, value]) => ({
          country,
          value,
        }))
      : []

  const hasForecast = forecastData.length > 0
  const hasInvestment = investmentData.length > 0
  const hasPatents = patentTimeline.length > 0

  return (
    <div className="space-y-6">
      {/* ================= Market Forecasting ================= */}
      <Card>
        <CardHeader>
          <CardTitle>Market Forecasting</CardTitle>
          <CardDescription>
            Technology adoption trend derived from ML analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasForecast ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={forecastData}>
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopOpacity={0.3} />
                    <stop offset="95%" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="step" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="value"
                  strokeWidth={2}
                  fill="url(#trendFill)"
                  name="Adoption Trend"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">
              No trend data available yet.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ================= Investment Distribution ================= */}
      <Card>
        <CardHeader>
          <CardTitle>Relative Investment Index</CardTitle>
          <CardDescription>
            Country-wise relative investment inferred from patents, research output,
            and industrial presence
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasInvestment ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={investmentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="country" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">
              Investment data not available.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ================= Patent Activity ================= */}
      <Card>
        <CardHeader>
          <CardTitle>Patent Activity Timeline</CardTitle>
          <CardDescription>
            Historical patent filing trends (ML-derived)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasPatents ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={patentTimeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  strokeWidth={3}
                  dot={{ r: 5 }}
                  name="Patents Filed"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">
              No patent activity available yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
