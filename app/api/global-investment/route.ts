import { NextResponse } from "next/server"
import globalTechPulse from "@/data/global/global_investments.json"

export async function GET() {
  try {
    return NextResponse.json(globalTechPulse.countries)
  } catch (error) {
    console.error("Global investment API error:", error)

    return NextResponse.json(
      { error: "Failed to load global investment data" },
      { status: 500 }
    )
  }
}