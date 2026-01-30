export const runtime = "nodejs"

import { NextResponse } from "next/server"
import path from "path"
import fs from "fs/promises"
import { exec } from "child_process"
import util from "util"

const execAsync = util.promisify(exec)

/* ---------- helpers ---------- */
async function fileExists(p: string) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

async function waitForFile(p: string, retries = 20) {
  for (let i = 0; i < retries; i++) {
    if (await fileExists(p)) return true
    await new Promise(r => setTimeout(r, 500))
  }
  return false
}

/* ---------- GET /api/tech/[name] ---------- */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ name: string }> }
) {
  const { name } = await ctx.params   // ✅ REQUIRED

  console.log(" GET ROUTE HIT, TECH =", name)
  const { searchParams } = new URL(req.url)

  const filters = {
    from: searchParams.get("from"),       // e.g. 2020
    to: searchParams.get("to"),           // e.g. 2024
    entity: searchParams.get("entity"),   // patent | paper | company
    country: searchParams.get("country"), // usa | india
  }

  console.log("🧪 FILTERS =", filters)

  if (!name || name === "undefined") {
    return NextResponse.json(
      { error: "Invalid technology name" },
      { status: 400 }
    )
  }

  const tech = decodeURIComponent(name)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")

  const dataDir = path.join(process.cwd(), "data", "tech")
  const dashboardPath = path.join(dataDir, `${tech}.json`)
  const kgPath = path.join(dataDir, `${tech}_kg.json`)


  return NextResponse.json(
    { error: "Cache miss. Call /run" },
    { status: 404 }
  )
}