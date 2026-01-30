import { NextResponse } from "next/server"

import globalPatents from "@/data/global/global_patents.json"
import globalTrends from "@/data/global/global_trends.json"

export const runtime = "nodejs"

export async function GET() {
  try {
    // ---------- Basic existence checks ----------
    if (!globalPatents || !globalTrends) {
      throw new Error("One or more JSON imports failed")
    }

    if (
      !globalPatents.generated_at ||
      !Array.isArray(globalPatents.signals)
    ) {
      throw new Error("Malformed global patents JSON")
    }

    if (
      !globalTrends.generated_at ||
      !Array.isArray(globalTrends.signals)
    ) {
      throw new Error("Malformed global trends JSON")
    }

    return NextResponse.json({
      generated_at: {
        patents: globalPatents.generated_at,
        trends: globalTrends.generated_at,
      },
      counts: {
        patents: globalPatents.counts ?? globalPatents.signals.length,
        trends: globalTrends.counts ?? globalTrends.signals.length,
      },
      patents: globalPatents.signals,
      trends: globalTrends.signals,
    })
  } catch (err) {
    console.error("Global signals route error:", err)

    return NextResponse.json(
      { error: "Global signals not available" },
      { status: 404 }
    )
  }
}