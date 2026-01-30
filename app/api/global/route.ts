import { NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"

export const runtime = "nodejs"

export async function GET() {
  try {
    const filePath = path.join(
      process.cwd(),
      "data",
      "global",
      "global_tech_pulse.json"
    )

    const json = JSON.parse(await fs.readFile(filePath, "utf-8"))

    return NextResponse.json({
      generated_at: json.generated_at,
      summary: json.summary,
      trends: json.entities.news,   // 👈 important
      patents: json.entities.patents
    })
  } catch (err) {
    return NextResponse.json(
      { error: "Global trends not available" },
      { status: 404 }
    )
  }
}