export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { Technology } from "@/models/technology"

/* ---------- GET /api/tech/[name] ---------- */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ name: string }> }
) {
  const { name } = await ctx.params

  if (!name) {
    return NextResponse.json(
      { error: "Invalid technology name" },
      { status: 400 }
    )
  }

  const tech = decodeURIComponent(name)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")

  await connectDB()

  const doc = await Technology.findOne({ name: tech })

  if (!doc || !doc.latest_json) {
    return NextResponse.json(
      { error: "No data found. Call /run" },
      { status: 404 }
    )
  }

  return NextResponse.json({
    dashboard: doc.latest_json.dashboard ?? null,
    knowledge_graph: doc.latest_json.knowledge_graph ?? null,
  })
}