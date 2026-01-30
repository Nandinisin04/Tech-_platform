export const runtime = "nodejs"

import { NextResponse } from "next/server"
import path from "path"
import fs from "fs/promises"
import { exec } from "child_process"
import util from "util"

const execAsync = util.promisify(exec)

async function waitForFile(p: string, retries = 20) {
  for (let i = 0; i < retries; i++) {
    try {
      await fs.access(p)
      return true
    } catch {
      await new Promise(r => setTimeout(r, 500))
    }
  }
  return false
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ name: string }> }
) {
  const { name } = await ctx.params   // ✅ CRITICAL FIX

  if (!name) {
    return NextResponse.json(
      { error: "Missing technology name" },
      { status: 400 }
    )
  }

  console.log("🔁 RUN ML FOR =", name)

  const tech = decodeURIComponent(name)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")

  const dataDir = path.join(process.cwd(), "data", "tech")
  const dashboardPath = path.join(dataDir, `${tech}.json`)
  const kgPath = path.join(dataDir, `${tech}_kg.json`)

  await fs.mkdir(dataDir, { recursive: true })

  const pythonCmd =
    process.platform === "win32"
      ? path.join(process.cwd(), "ml", "venv", "Scripts", "python.exe")
      : path.join(process.cwd(), "ml", "venv", "bin", "python")

  const scriptPath = path.join(process.cwd(), "ml", "run_pipeline.py")

  await execAsync(`"${pythonCmd}" "${scriptPath}" "${tech}"`, {
    shell: true,
    timeout: 1000 * 60 * 5,
  })

  if (!(await waitForFile(dashboardPath))) {
    return NextResponse.json(
      { error: "ML ran but JSON not generated" },
      { status: 500 }
    )
  }

  const dashboard = JSON.parse(
    await fs.readFile(dashboardPath, "utf-8")
  )

  const kg = (await waitForFile(kgPath, 5))
    ? JSON.parse(await fs.readFile(kgPath, "utf-8"))
    : null

  return NextResponse.json({
    status: "success",
    technology: tech,
    data: dashboard,
    knowledge_graph: kg,
  })
}