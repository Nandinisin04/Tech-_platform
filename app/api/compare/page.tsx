"use client"

import { useSearchParams } from "next/navigation"
import { useState } from "react"
import CompareDashboardContent from "@/components/compare/compare-dashboard-content"

export default function ComparePage() {
  const searchParams = useSearchParams()

  const baseTech = searchParams.get("tech")?.toLowerCase() || "ai"
  const compareTechParam = searchParams.get("compare")?.toLowerCase() || null

  const [rightTech, setRightTech] = useState<string | null>(compareTechParam)

  return (
    <div className="w-full">
      {/* HEADER */}
      <div className="flex items-center justify-between px-6 pt-6">
        <h1 className="text-2xl font-bold capitalize">
          {baseTech} Dashboard
        </h1>

        
      </div>

      {/* SEARCH BAR */}
      <div className="sticky top-0 z-20 bg-background border-b mt-4">
        <div className="flex justify-center p-4">
          <input
            placeholder="Search technology to compare…"
            className="border px-4 py-2 rounded-md w-full max-w-lg"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setRightTech(e.currentTarget.value.toLowerCase())
              }
            }}
          />
        </div>
      </div>

      {/* DASHBOARDS */}
      <div className="grid grid-cols-2 gap-6 p-6">
        <CompareDashboardContent tech={baseTech} />
        {rightTech && (
          <CompareDashboardContent tech={rightTech} />
        )}
      </div>
    </div>
  )
}