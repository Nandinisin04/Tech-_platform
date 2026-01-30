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
  const filePath = path.join(dataDir, `${tech}.json`)

  // 🔹 ALWAYS try to read cache first
  if (await fileExists(filePath)) {
    const cached = await fs.readFile(filePath, "utf-8")
    return NextResponse.json(JSON.parse(cached))
  }

  // 🔹 HARD ML TRIGGER (NO EARLY EXIT)
  console.log(`⚙ ML triggered for missing tech: ${tech}`)

  const pythonCmd =
    process.platform === "win32"
      ? "ml\\venv\\Scripts\\python.exe"
      : "ml/venv/bin/python"

  await execAsync(`"${pythonCmd}" ml/run_pipeline.py "${tech}"`, {
    timeout: 1000 * 60 * 5,
  })

  // 🔹 WAIT until file is created
  const created = await waitForFile(filePath)

  if (!created) {
    return NextResponse.json(
      { error: "ML ran but JSON was not generated" },
      { status: 500 }
    )
  }

  const data = await fs.readFile(filePath, "utf-8")
  return NextResponse.json(JSON.parse(data))
}
