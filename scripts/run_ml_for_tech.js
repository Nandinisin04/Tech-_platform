const { exec } = require("child_process")

function runML(tech) {
  console.log(`🚀 Triggering ML for ${tech}`)

  exec(
    `python ml/run_pipeline.py ${tech}`,
    (error, stdout, stderr) => {
      if (error) {
        console.error("ML error:", error)
        return
      }
      console.log(stdout)
    }
  )
}

const tech = process.argv[2]
if (!tech) {
  console.error("❌ Technology name missing")
  process.exit(1)
}

runML(tech)
