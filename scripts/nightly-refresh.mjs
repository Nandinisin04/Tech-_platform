import path from "path"
import { exec } from "child_process"
import util from "util"

import {
  getAllTechnologies,
  upsertTechnology,
} from "../lib/db/queries.js"

const execAsync = util.promisify(exec)

async function run() {
  console.log("Midnight refresh started")

  const techs = await getAllTechnologies()

  if (!techs.length) {
    console.log("No technologies found in DB")
    return
  }

  const pythonCmd =
    process.platform === "win32"
      ? path.join(process.cwd(), "ml", "venv", "Scripts", "python.exe")
      : path.join(process.cwd(), "ml", "venv", "bin", "python")

  const scriptPath = path.join(process.cwd(), "ml", "run_pipeline.py")

  for (const row of techs) {
    const tech = row.name
    console.log(`Refreshing ${tech}`)

    try {
      await execAsync(`"${pythonCmd}" "${scriptPath}" "${tech}"`, {
        shell: true,
        timeout: 1000 * 60 * 5,
      })

      const jsonPath = path.join(
        process.cwd(),
        "data",
        "tech",
        `${tech}.json`
      )

      await upsertTechnology(
        tech,
        jsonPath,
        new Date().toISOString()
      )

      console.log(`Updated ${tech}`)
    } catch (err) {
      console.error(`Failed ${tech}`, err)
    }
  }

  console.log("Midnight refresh completed")
}

run()