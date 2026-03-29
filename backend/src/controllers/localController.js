import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

function getMetricConclusion(label = "", value = "") {
  const l = String(label).toLowerCase();
  const v = String(value).toLowerCase();

  if (l.includes("temperature")) {
    if (
      v.includes("530") ||
      v.includes("900") ||
      v.includes("1100") ||
      v.includes("700")
    ) {
      return "Temperature varies significantly, indicating the system is highly temperature-sensitive.";
    }
    return "Temperature strongly impacts ignition or combustion behavior.";
  }

  if (l.includes("pressure")) {
    return "Pressure likely affects density, stability, and system feasibility.";
  }

  if (l.includes("time") || l.includes("delay")) {
    return "This suggests a fast and potentially critical transient event.";
  }

  if (l.includes("concentration") || l.includes("percentage")) {
    return "Small concentration changes may significantly alter system response.";
  }

  if (l.includes("velocity") || l.includes("speed")) {
    return "Velocity appears to be an important performance or transition parameter.";
  }

  return "Metric extracted from document context.";
}
export const uploadLocalDocument = async (req, res) => {
  try {
    console.log("📥 /api/local/upload HIT");

    if (!req.file) {
      console.log("❌ No file found in request");
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("📄 File received:");
    console.log("   name:", req.file.originalname);
    console.log("   size:", req.file.size);
    console.log("   type:", req.file.mimetype);

    // temp dir inside backend
    const tempDir = path.join(process.cwd(), "temp");
    console.log("📂 tempDir:", tempDir);

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      console.log("✅ Temp folder created");
    }

    const safeName = req.file.originalname.replace(/\s+/g, "_");
    const tempPath = path.join(tempDir, `${Date.now()}-${safeName}`);
    fs.writeFileSync(tempPath, req.file.buffer);

    console.log("💾 Temp PDF saved at:", tempPath);

    // ML service script path
    const pythonScript = path.join(process.cwd(), "..", "ml-service", "extract_text.py");
    console.log("🐍 Python script path:", pythonScript);

    if (!fs.existsSync(pythonScript)) {
      console.log("❌ extract_text.py NOT FOUND");
      return res.status(500).json({
        error: `extract_text.py not found at ${pythonScript}`,
      });
    }

    console.log("🚀 Running Python extraction...");
    const pythonExe = path.join(
        process.cwd(),
        "..",
        "ml-service",
        "venv",
        "Scripts",
        "python.exe"
        );

        console.log("🐍 Using Python executable:", pythonExe);

        if (!fs.existsSync(pythonExe)) {
        return res.status(500).json({
            error: `Python executable not found at ${pythonExe}`,
        });
        }

        const { stdout, stderr } = await execFileAsync(pythonExe, [pythonScript, tempPath], {
        maxBuffer: 20 * 1024 * 1024,
        });

    console.log("✅ Python finished");

    if (stderr) {
      console.log("⚠️ Python stderr:", stderr);
    }

    console.log("📜 Extracted stdout length:", stdout?.length || 0);

    const extractedText = stdout?.trim() || "";
    console.log("📝 First 500 chars of extracted text:");
    console.log(extractedText.slice(0, 500));

    // delete temp file
    try {
      fs.unlinkSync(tempPath);
      console.log("🗑️ Temp file deleted");
    } catch (cleanupErr) {
      console.log("⚠️ Could not delete temp file:", cleanupErr.message);
    }

    const insights = buildInsightsFromText(extractedText);

    console.log("✅ Returning JSON response");

    return res.status(200).json({
      doc: {
        id: Date.now().toString(),
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype,
        uploadedAt: new Date().toISOString(),
        insights,
        security: {
          storedFile: false,
          externalCalls: false,
        },
      },
    });
  } catch (error) {
    console.error("❌ Local upload failed FULL ERROR:");
    console.error(error);

    return res.status(500).json({
      error: error.message || "Failed to process local document",
    });
  }
};

function buildInsightsFromText(text) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const summary = lines.slice(0, 3);
  const keyFindings = lines.slice(3, 8);
  const risks = lines.filter((l) =>
    /risk|limitation|uncertain|challenge|error|sensitive/i.test(l)
  ).slice(0, 5);

  const recommendations = [
    "Review extracted methodology carefully.",
    "Validate key metrics with source tables/figures.",
    "Check assumptions before using for decision-making.",
  ];

  const rawMetrics = extractMetrics(text);

  const metrics = rawMetrics.map((m) => ({
    ...m,
    conclusion: getMetricConclusion(m.label, m.value),
  }));

  return {
    summary: summary.length ? summary : ["No summary extracted"],
    keyFindings: keyFindings.length ? keyFindings : ["No key findings extracted"],
    risks: risks.length ? risks : ["No major risks detected"],
    recommendations,
    metrics,
    brief: {
      objective: summary[0] || "Objective not clearly extracted",
      decision: "Requires scientist review",
      methodSetup: lines.slice(8, 13),
      novelty: lines[13] || "Novelty not clearly extracted",
      keyNumbers: metrics.slice(0, 5).map((m) => ({
        label: m.label,
        value: m.value,
      })),
      assumptions: ["Assumptions should be manually validated"],
      openQuestions: ["Need domain verification of extracted results"],
      risks: risks.length ? risks : ["No explicit risks found"],
      actionItems: [
        "Verify extracted values with PDF tables",
        "Review method setup manually",
        "Use this as support, not final truth",
      ],
      confidence: Math.min(95, 50 + metrics.length * 5),
    },
    tags: [],
    timeline: [],
  };
}

function extractMetrics(text) {
  const metricMatches = [
    ...text.matchAll(/([A-Za-z %()\-]{3,30})[:\s]+(\d+(\.\d+)?\s?(K|°C|ms|s|bar|atm|%|MPa|Pa|USD|m\/s)?)/g),
  ];

  return metricMatches.slice(0, 10).map((m) => ({
    label: m[1].trim(),
    value: m[2].trim(),
    context: `Extracted from document text near "${m[0].slice(0, 60)}"`,
  }));
}