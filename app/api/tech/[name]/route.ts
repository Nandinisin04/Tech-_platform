import { NextResponse } from "next/server"
import path from "path"
import fs from "fs/promises"
import { exec } from "child_process"
import util from "util"

const execAsync = util.promisify(exec)

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function waitForFile(filePath: string, retries = 20) {
  for (let i = 0; i < retries; i++) {
    if (await fileExists(filePath)) return true
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params

  const tech = decodeURIComponent(name)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")

  const dataDir = path.join(process.cwd(), "data", "tech")
  const dashboardPath = path.join(dataDir, `${tech}.json`)
  const kgPath = path.join(dataDir, `${tech}_kg.json`) // 🔹 NEW

  // ================= CACHE FIRST =================
  if (await fileExists(dashboardPath)) {
    const dashboard = JSON.parse(await fs.readFile(dashboardPath, "utf-8"))

    let kg = null
    if (await fileExists(kgPath)) {
      kg = JSON.parse(await fs.readFile(kgPath, "utf-8"))
    }

    return NextResponse.json({
      dashboard,
      knowledge_graph: kg,
    })
  }

  // ================= ML TRIGGER =================
  console.log(`⚙ ML triggered for missing tech: ${tech}`)

  const pythonCmd =
    process.platform === "win32"
      ? "ml\\venv\\Scripts\\python.exe"
      : "ml/venv/bin/python"

  await execAsync(`"${pythonCmd}" ml/run_pipeline.py "${tech}"`, {
    timeout: 1000 * 60 * 5,
  })

  // ================= WAIT FOR OUTPUT =================
  const created = await waitForFile(dashboardPath)

  if (!created) {
    return NextResponse.json(
      { error: "ML ran but JSON was not generated" },
      { status: 500 }
    )
  }

  const dashboard = JSON.parse(await fs.readFile(dashboardPath, "utf-8"))

  let kg = null
  if (await fileExists(kgPath)) {
    kg = JSON.parse(await fs.readFile(kgPath, "utf-8"))
  }

  return NextResponse.json({
    dashboard,
    knowledge_graph: kg,
  })
}