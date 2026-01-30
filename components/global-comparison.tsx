"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts"

const INVESTMENT_DATA = [
  { country: "United States", value: 285, change: "+12%" },
  { country: "China", value: 198, change: "+18%" },
  { country: "Germany", value: 78, change: "+8%" },
  { country: "Japan", value: 65, change: "+5%" },
  { country: "South Korea", value: 52, change: "+22%" },
  { country: "UK", value: 45, change: "+15%" },
]

const PATENT_FILING_TREND = [
  { year: "2020", US: 2400, China: 1800, EU: 1200, Japan: 980 },
  { year: "2021", US: 2610, China: 2100, EU: 1400, Japan: 1080 },
  { year: "2022", US: 2900, China: 2800, EU: 1600, Japan: 1200 },
  { year: "2023", US: 3200, China: 3400, EU: 1900, Japan: 1450 },
  { year: "2024", US: 3500, China: 3900, EU: 2200, Japan: 1650 },
]

const SECTOR_DATA: Record<string, Array<{ name: string; percentage: number }>> = {
  "United States": [
    { name: "Quantum Computing", percentage: 28 },
    { name: "AI & Machine Learning", percentage: 24 },
    { name: "Advanced Semiconductors", percentage: 18 },
    { name: "Hypersonics", percentage: 12 },
    { name: "Biotech", percentage: 18 },
  ],
  China: [
    { name: "5G/6G", percentage: 22 },
    { name: "AI & Machine Learning", percentage: 26 },
    { name: "Semiconductors", percentage: 24 },
    { name: "Battery Technology", percentage: 16 },
    { name: "Space Technology", percentage: 12 },
  ],
  Germany: [
    { name: "Green Energy", percentage: 26 },
    { name: "Advanced Materials", percentage: 20 },
    { name: "Autonomous Systems", percentage: 18 },
    { name: "Quantum Computing", percentage: 16 },
    { name: "Industrial IoT", percentage: 20 },
  ],
  Japan: [
    { name: "Robotics", percentage: 24 },
    { name: "Semiconductors", percentage: 22 },
    { name: "Battery Technology", percentage: 20 },
    { name: "AI Applications", percentage: 18 },
    { name: "Advanced Materials", percentage: 16 },
  ],
  "South Korea": [
    { name: "Display Technology", percentage: 28 },
    { name: "5G/6G", percentage: 22 },
    { name: "Battery Tech", percentage: 20 },
    { name: "AI & ML", percentage: 18 },
    { name: "Semiconductors", percentage: 12 },
  ],
  UK: [
    { name: "Quantum Computing", percentage: 26 },
    { name: "AI & Machine Learning", percentage: 24 },
    { name: "Biotech", percentage: 20 },
    { name: "Green Energy", percentage: 18 },
    { name: "Autonomous Systems", percentage: 12 },
  ],
}

export function GlobalComparison() {
  const [selectedCountry, setSelectedCountry] = useState("United States")

  return (
    <div className="w-full space-y-8">
      {/* Section Title */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Global Technology Advancement Metrics</h2>
        <p className="text-muted-foreground">Country-wise comparison of technological investment and innovation</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {INVESTMENT_DATA.map((item) => (
          <Card key={item.country} className="text-center">
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground mb-2">{item.country}</p>
              <p className="text-2xl font-bold text-primary">${item.value}B</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">{item.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Investment Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Technology Investment by Country</CardTitle>
            <CardDescription>2024 R&D spending in billions USD</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={INVESTMENT_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="country" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={100} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                  }}
                />
                <Bar dataKey="value" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Patent Filing Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Patent Filing Trends</CardTitle>
            <CardDescription>Annual patent filings 2020-2024</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={PATENT_FILING_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: "16px" }} />
                <Line type="monotone" dataKey="US" stroke="var(--color-chart-1)" strokeWidth={2} />
                <Line type="monotone" dataKey="China" stroke="var(--color-chart-2)" strokeWidth={2} />
                <Line type="monotone" dataKey="EU" stroke="var(--color-chart-3)" strokeWidth={2} />
                <Line type="monotone" dataKey="Japan" stroke="var(--color-chart-4)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Sectors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top Technology Sectors by Country Investment</CardTitle>
          <CardDescription>Primary focus areas for national technology development</CardDescription>
          <div className="mt-4">
            <label className="text-sm font-medium text-foreground block mb-2">Select Country:</label>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full md:w-48 px-4 py-2 rounded-lg border border-border bg-background text-foreground hover:border-primary transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {Object.keys(SECTOR_DATA).map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground text-base">{selectedCountry}</h4>
              <div className="space-y-3">
                {SECTOR_DATA[selectedCountry]?.map((sector) => (
                  <div key={sector.name} className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-foreground">{sector.name}</span>
                      <span className="text-primary font-semibold">{sector.percentage}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300 rounded-full"
                        style={{ width: `${sector.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
