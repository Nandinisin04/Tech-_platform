import { NextResponse } from "next/server"
import { writeFile, unlink } from "fs/promises"
import path from "path"
import os from "os"
import { spawn } from "child_process"

console.log("🔥 LOCAL UPLOAD ROUTE VERSION = SCIENTIST_BRIEF_V1")

/**
 * ✅ Better cleaning:
 * - removes extra whitespace
 * - removes common journal/metadata noise
 */
function normalizeText(text: string) {
  return text
    .replace(/\s+/g, " ")
    .replace(/ISSN\s*\d{4}-\d{4}/gi, "")
    .replace(/Reprinted from/gi, "")
    .replace(/Multi-Science Publishing/gi, "")
    .replace(/Volume\s*\d+/gi, "")
    .replace(/Number\s*\d+/gi, "")
    .replace(/©/g, "")
    .trim()
}

/**
 * ✅ Sentence splitter (offline)
 */
function splitSentences(text: string) {
  return normalizeText(text)
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 50 && s.length < 320)
}

/**
 * ✅ Sentence scoring (offline heuristic)
 */
function scoreSentence(sentence: string, keywords: string[]) {
  const s = sentence.toLowerCase()
  let score = 0

  for (const k of keywords) if (s.includes(k)) score += 2

  // numbers + units boost
  if (/\d/.test(sentence)) score += 1
  if (/%|k\b|µs|ms|atm|bar|pa|kelvin/i.test(sentence)) score += 2

  // header/junk penalty
  if (/issn|publishing|reprinted|volume|number/i.test(sentence)) score -= 6

  // chemistry equation penalty
  if (sentence.includes("<=>") || sentence.includes("=>")) score -= 5
  if (/h2|o2|oh|n2/i.test(sentence)) score -= 3

  return score
}

function pickTop(sentences: string[], keywords: string[], limit: number) {
  return sentences
    .map((s) => ({ s, score: scoreSentence(s, keywords) }))
    .sort((a, b) => b.score - a.score)
    .filter((x) => x.score > 0)
    .slice(0, limit)
    .map((x) => x.s)
}

function uniqueSentences(list: string[]) {
  const seen = new Set<string>()
  const out: string[] = []

  for (const item of list) {
    const key = item.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      out.push(item)
    }
  }
  return out
}
function classifyMetricLabel(base: string, context: string) {
  const c = context.toLowerCase()

  // 🌡️ Temperature classification
  if (base === "Temperature") {
    if (c.includes("static gas")) return "Static Gas Temperature"
    if (c.includes("initial")) return "Initial Temperature"
    if (c.includes("room")) return "Room Temperature"
    if (c.includes("range")) return "Temperature Range"
    return "Temperature"
  }

  // 🧭 Pressure classification
  if (base === "Pressure") {
    if (c.includes("static gas")) return "Static Gas Pressure"
    if (c.includes("initial")) return "Initial Pressure"
    return "Pressure"
  }

  // ⏱️ Time classification
  if (base === "Time") {
    if (c.includes("induction time") || c.includes("it"))
      return "Induction Time"
    if (c.includes("mixing time")) return "Mixing Time"
    if (c.includes("moment")) return "Event Time"
    return "Time"
  }

  // 📊 Percentage classification
  if (base === "Percentage") {
    if (c.includes("concentration")) return "Concentration"
    return "Percentage"
  }

  return base
}

function extractMetricsWithContext(text: string, limit = 20) {
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40 && s.length < 320)

  const patterns = [
    { base: "Temperature", regex: /\b(\d+(\.\d+)?)\s?K\b/i },
    { base: "Pressure", regex: /\b(\d+(\.\d+)?)\s?(atm|bar|Pa|kPa|MPa)\b/i },
    { base: "Time", regex: /\b(\d+(\.\d+)?)\s?(µs|us|ms|s)\b/i },
    { base: "Percentage", regex: /\b(\d+(\.\d+)?)\s?%\b/i },
  ]

  const raw: {
    label: string
    value: string
    context: string
  }[] = []

  for (const sent of sentences) {
    for (const p of patterns) {
      const match = sent.match(p.regex)

      if (match) {
        const value = match[0]
        const label = classifyMetricLabel(p.base, sent)

        const key = `${label}:${value}`

        if (!raw.some((x) => `${x.label}:${x.value}` === key)) {
          raw.push({
            label,
            value,
            context: sent,
          })
        }
      }
    }

    if (raw.length >= limit) break
  }

  // ✅ GROUP similar metrics
  const grouped: Record<
    string,
    {
      label: string
      values: string[]
      context: string
    }
  > = {}

  for (const m of raw) {
    if (!grouped[m.label]) {
      grouped[m.label] = {
        label: m.label,
        values: [m.value],
        context: m.context,
      }
    } else {
      grouped[m.label].values.push(m.value)
    }
  }

  return Object.values(grouped).map((g) => ({
    label: g.label,
    value: Array.from(new Set(g.values)).join(", "),
    context: g.context,
  }))
}

function buildScientistBrief(rawText: string, sentences: string[], metrics: any[]) {
  const t = rawText.toLowerCase()

  // ✅ Objective
  let objective = "Extract actionable scientific signals from the document."
  if (t.includes("plasma") && t.includes("combustion")) {
    objective =
      "Assess plasma-assisted combustion behavior for scramjet-like flow conditions."
  } else if (t.includes("scramjet")) {
    objective = "Summarize scramjet-relevant ignition/combustion constraints."
  } else if (t.includes("hypersonic")) {
    objective = "Summarize hypersonic-relevant findings and operating ranges."
  }

  // ✅ Decision tag
  let decision = "Maybe Relevant"
  if (
    t.includes("scramjet") ||
    t.includes("hypersonic") ||
    t.includes("plasma assisted") ||
    t.includes("plasma-assisted")
  ) {
    decision = "Highly Relevant"
  }
  if (t.includes("review") && !t.includes("experiment") && !t.includes("simulation")) {
    decision = "Low Relevance"
  }

  // ✅ METHOD / SETUP (Extracted lines + fallback)
  const methodSetupRaw = pickTop(
    sentences,
    ["model", "simulation", "mechanism", "numerical", "experiment", "developed", "constructed"],
    2
  )

  const methodSetup =
    methodSetupRaw.length > 0
      ? methodSetupRaw
      : [
          "Method details not clearly extracted (PDF formatting/noise issue).",
          "Suggestion: verify the Methods/Setup section manually for exact configuration.",
        ]

  // ✅ NOVELTY / CONTRIBUTION (Extracted line + fallback)
  const noveltyLines = pickTop(
    sentences,
    ["developed", "propose", "proposed", "new", "combining", "non-thermal", "first", "novel"],
    2
  )

  const novelty =
    noveltyLines.length > 0
      ? noveltyLines[0]
      : "Novelty not explicitly extracted. Likely contribution: domain-specific modeling with parameter tuning for operational conditions."

  // ✅ ASSUMPTIONS (Offline heuristics + fallback)
  const assumptions: string[] = []

  if (t.includes("simplification") || t.includes("assumption")) {
    assumptions.push(
      "Paper contains modeling assumptions/simplifications which may affect transfer to real conditions."
    )
  }
  if (t.includes("constant") && t.includes("density")) {
    assumptions.push("Density treated as constant along flow (approximation).")
  }
  if (t.includes("steady") || t.includes("steady-state")) {
    assumptions.push("Possible steady-state assumption; verify transient behavior relevance.")
  }

  if (assumptions.length === 0) {
    assumptions.push(
      "Assumptions not explicitly extracted. Verify boundary conditions, constraints and validity range manually."
    )
  }

  // ✅ Key Numbers
  const keyNumbers = (metrics || []).slice(0, 8).map((m: any) => ({
    label: m.label,
    value: m.value,
  }))

  // ✅ Open Questions
  const openQuestions: string[] = []

  if (t.includes("induction time")) {
    openQuestions.push(
      "What is the maximum allowable induction time for your combustor residence time?"
    )
  }
  if (t.includes("pressure")) {
    openQuestions.push(
      "Are these pressure conditions matching your test chamber / flight regime?"
    )
  }
  if (t.includes("temperature")) {
    openQuestions.push(
      "Does the model remain stable across the full temperature range for your fuel/oxidizer mix?"
    )
  }
  if (t.includes("simplification") || t.includes("assumption")) {
    openQuestions.push(
      "Which assumptions break when moving from simulation → real deployment conditions?"
    )
  }

  if (openQuestions.length === 0) {
    openQuestions.push(
      "Which extracted results are directly reproducible in your internal setup?"
    )
  }

  // ✅ Risks
  const risks = [
    "Results may be highly sensitive to operating conditions (T/P/time scales).",
    "Simulation assumptions may not transfer directly to real scramjet flow dynamics.",
    "Verify if chemistry mechanism matches your fuel/oxidizer setup.",
  ]

  // ✅ Action Items
  const actionItems: string[] = [
    "Extract operating ranges and map them to your internal regime (T, P, residence time).",
    "Run sensitivity sweep for dominant parameters (T/P/time/concentration).",
    "Identify 1 experiment/simulation you can replicate quickly to validate feasibility.",
  ]

  // ✅ Confidence score (offline heuristic)
  const confidence =
    Math.min(
      95,
      45 +
        Math.min(25, keyNumbers.length * 5) +
        Math.min(15, sentences.length / 40) +
        (methodSetupRaw.length > 0 ? 5 : 0)
    ) | 0

  return {
    objective,
    decision,
    methodSetup,
    novelty,
    keyNumbers,
    assumptions,
    openQuestions,
    risks,
    actionItems,
    confidence,
  }
}

/**
 * ✅ Python extraction (offline)
 */
function runPythonExtract(pdfPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const py = spawn("python", ["ml/extract_text.py", pdfPath])

    let out = ""
    let err = ""

    py.stdout.on("data", (d) => (out += d.toString()))
    py.stderr.on("data", (d) => (err += d.toString()))

    py.on("close", (code) => {
      if (code !== 0) reject(new Error(err || "Python extraction failed"))
      else resolve(out)
    })
  })
}


export async function POST(req: Request) {
  let tempPath = ""

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // ✅ Save temporarily (process-only)
    tempPath = path.join(os.tmpdir(), `${crypto.randomUUID()}.pdf`)
    await writeFile(tempPath, buffer)

    // ✅ Offline extraction using python (NO LLM)
    const rawText = await runPythonExtract(tempPath)
    const sentences = splitSentences(rawText)

    // ✅ Summary
    const summary = pickTop(
      sentences,
      ["abstract", "propose", "model", "method", "approach", "developed", "study"],
      3
    )

    // ✅ Key findings
    const keyFindings = pickTop(
      sentences,
      [
        "result",
        "shows",
        "increase",
        "decrease",
        "improve",
        "performance",
        "temperature",
        "pressure",
        "simulation",
        "achieved",
      ],
      4
    )

    // ✅ Risks / limitations
    const risks = pickTop(
      sentences,
      ["limitation", "challenge", "problem", "simplification", "assumption", "error"],
      3
    )

    // ✅ Recommendations (offline)
    const recommendations = [
      "Run sensitivity analysis on key parameters mentioned (thresholds, concentrations, operating conditions).",
      "Cross-validate results using an independent baseline or simplified analytical model.",
      "Evaluate stability under edge-case conditions before deployment (noise, clutter, small targets).",
    ]

    // ✅ Metrics extraction
    const metrics = extractMetricsWithContext(rawText)

    // ✅ Scientist Brief
    const brief = buildScientistBrief(rawText, sentences, metrics)

    const insights = {
      summary: uniqueSentences(summary.length ? summary : sentences.slice(0, 3)),
      keyFindings: uniqueSentences(keyFindings),
      risks: uniqueSentences(risks),
      recommendations: uniqueSentences(recommendations),
      metrics,
      brief,
    }

    const doc = {
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
      insights,
      security: {
        storedFile: false,
        externalCalls: false,
      },
    }

    return NextResponse.json({ doc })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json(
      { error: err?.message || "Upload failed" },
      { status: 500 }
    )
  } finally {
    // ✅ Delete PDF immediately
    if (tempPath) {
      try {
        await unlink(tempPath)
      } catch {}
    }
  }
}