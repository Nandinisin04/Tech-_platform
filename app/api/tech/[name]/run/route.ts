import { NextResponse } from "next/server"
import path from "path"
import fs from "fs/promises"
import { exec } from "child_process"
import util from "util"

const execAsync = util.promisify(exec)

async function waitForFile(filePath: string, retries = 15) {
  for (let i = 0; i < retries; i++) {
    try {
      await fs.access(filePath)
      return true
    } catch {
      await new Promise((r) => setTimeout(r, 400))
    }
  }
  return false
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params

    const tech = decodeURIComponent(name)
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "_")

    const dataDir = path.join(process.cwd(), "data", "tech")
    const filePath = path.join(dataDir, `${tech}.json`)

    await fs.mkdir(dataDir, { recursive: true })

    const pythonCmd =
      process.platform === "win32"
        ? "ml\\venv\\Scripts\\python.exe"
        : "ml/venv/bin/python"

    const cmd = `"${pythonCmd}" ml/run_pipeline.py "${tech}"`

    await execAsync(cmd, {
      timeout: 1000 * 60 * 5,
    })

    const exists = await waitForFile(filePath)

    if (!exists) {
      return NextResponse.json(
        { error: "ML ran but JSON not generated" },
        { status: 500 }
      )
    }

    const json = JSON.parse(await fs.readFile(filePath, "utf-8"))

    return NextResponse.json({
      status: "success",
      technology: tech,
      data: json,
    })

  } catch (err) {
    console.error("ML error:", err)
    return NextResponse.json(
      { error: "Failed to run ML pipeline" },
      { status: 500 }
    )
  }
}