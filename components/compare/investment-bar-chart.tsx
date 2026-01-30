"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

const COLORS = ["#2563eb", "#16a34a", "#dc2626", "#7c3aed"]

export function InvestmentBarChart({ data }: { data: any[] }) {
  if (!data.length) return null

  const techs = Object.keys(data[0]).filter((k) => k !== "country")

  return (
    <div className="h-[420px] w-full rounded-xl border p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="country" />
          <YAxis />
          <Tooltip />
          <Legend />
          {techs.map((tech, i) => (
            <Bar
              key={tech}
              dataKey={tech}
              fill={COLORS[i % COLORS.length]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}