import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/* ─────────────────────────────────────────────────────────
   METRIC CONCLUSIONS
───────────────────────────────────────────────────────── */

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

/* ─────────────────────────────────────────────────────────
   LOCAL INTEL EXTRACTION
───────────────────────────────────────────────────────── */

function extractYear(text = "") {
  const m = text.match(/\b(19[5-9]\d|20[0-3]\d)\b/);
  return m ? parseInt(m[1]) : null;
}

function cleanTitle(raw = "") {
  return raw
    .replace(/\s+/g, " ")
    .replace(/^[\s\W]+|[\s\W]+$/g, "")
    .trim();
}

function extractVenue(line = "") {
  const venues = [
    "Lancet",
    "JAMA",
    "NEJM",
    "BMJ",
    "PubMed",
    "Medline",
    "Cochrane",
    "PLoS",
    "PLOS ONE",
    "Annals",
    "Nutrients",
    "Nutrition",
    "Cancer",
    "Oncology",
    "Epidemiology",
    "Radiology",
    "Nature",
    "Science",
    "Cell",
    "PNAS",
    "Scientific Reports",
    "IEEE",
    "ACM",
    "CVPR",
    "ICCV",
    "NeurIPS",
    "ICML",
    "ICLR",
    "arXiv",
    "IEEE Access",
    "IEEE Transactions",
    "Journal of",
    "Springer",
    "Elsevier",
    "Wiley",
    "Oxford",
    "Cambridge",
    "Taylor",
    "SAGE",
    "Frontiers",
    "BioMed",
    "MDPI",
  ];

  for (const v of venues) {
    if (new RegExp(`\\b${v}\\b`, "i").test(line)) return v;
  }

  return null;
}

function extractAuthors(line = "") {
  const m = line.match(
    /^((?:[A-Z]\.?\s+[A-Z][a-z]{2,}|[A-Z][a-z]{2,},\s+[A-Z]\.)(?:(?:,\s*(?:and\s+)?|\s+and\s+)(?:[A-Z]\.?\s+[A-Z][a-z]{2,}|[A-Z][a-z]{2,},\s+[A-Z]\.))*)/,
  );
  return m ? m[1].trim() : null;
}

function extractPatents(text = "") {
  const results = [];
  const seen = new Set();
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const patentNumRe = /\b([A-Z]{2}\d{6,11}[A-Z]?\d?)\b/g;
  let m;

  while ((m = patentNumRe.exec(text)) !== null) {
    const num = m[1];
    if (seen.has(num)) continue;
    seen.add(num);

    const lineStart = text.lastIndexOf("\n", m.index) + 1;
    const lineEnd = text.indexOf("\n", m.index + num.length);
    const line = text
      .slice(lineStart, lineEnd < 0 ? undefined : lineEnd)
      .trim();

    results.push({
      title: cleanTitle(line) || `Patent ${num}`,
      year: extractYear(line),
      assignee: null,
      patentNumber: num,
      snippet: line.length > 60 ? line.slice(0, 200) : null,
    });
  }

  for (const line of lines) {
    if (!/\bpatent/i.test(line)) continue;
    if (line.length < 15 || line.length > 350) continue;

    const key = line.slice(0, 50);
    if (seen.has(key)) continue;
    seen.add(key);

    const assigneeM = line.match(
      /(?:by|assignee|assigned to)[:\s]+([A-Z][A-Za-z &,]{2,40})(?:\.|,|\d|$)/,
    );

    results.push({
      title: cleanTitle(line),
      year: extractYear(line),
      assignee: assigneeM?.[1]?.trim() ?? null,
      patentNumber: null,
      snippet: null,
    });

    if (results.length >= 8) break;
  }

  if (results.length < 2) {
    const ipRe =
      /\b(?:inventor|invention|intellectual property|proprietary|filed|granted|claims?|prior art|novelty)\b/i;

    for (const line of lines) {
      if (!ipRe.test(line)) continue;
      if (line.length < 20 || line.length > 300) continue;

      const key = line.slice(0, 50);
      if (seen.has(key)) continue;
      seen.add(key);

      results.push({
        title: cleanTitle(line),
        year: extractYear(line),
        assignee: null,
        patentNumber: null,
        snippet: null,
      });

      if (results.length >= 8) break;
    }
  }

  return results.slice(0, 8);
}

function extractPublications(text = "") {
  const results = [];
  const seen = new Set();
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let refStart = -1;

  for (let i = 0; i < lines.length; i++) {
    if (
      /^(references|bibliography|works cited|literature cited|citations|further reading)$/i.test(
        lines[i],
      )
    ) {
      refStart = i + 1;
      break;
    }
  }

  const scanLines = refStart >= 0 ? lines.slice(refStart, refStart + 120) : lines;

  for (const line of scanLines) {
    if (line.length < 20 || line.length > 600) continue;

    const numRefM = line.match(/^[\[(]?\d{1,3}[\].)]\s+(.{15,})/);

    if (numRefM) {
      const raw = numRefM[1].trim();
      const key = raw.slice(0, 50);

      if (!seen.has(key)) {
        seen.add(key);

        const quoted = raw.match(/["“”'](.{10,150})["“”']/);
        const authors = extractAuthors(raw);

        let title = quoted ? quoted[1] : raw;
        if (!quoted && authors) {
          title = raw
            .slice(authors.length)
            .replace(/^[\s,."]+/, "")
            .split(/[,;"]/)[0];
        }

        results.push({
          title: cleanTitle(title || raw),
          authors,
          year: extractYear(raw),
          venue: extractVenue(raw),
          snippet: raw.slice(0, 250),
        });
      }

      continue;
    }

    if (/\bdoi\.org|doi:\s*10\.|arxiv\.org|pubmed|ncbi\.nlm/i.test(line)) {
      const clean = line
        .replace(/https?:\S+/g, "")
        .replace(/doi:\S+/gi, "")
        .trim();

      const key = clean.slice(0, 50);

      if (clean.length > 15 && !seen.has(key)) {
        seen.add(key);

        results.push({
          title: cleanTitle(clean),
          authors: extractAuthors(clean),
          year: extractYear(line),
          venue: extractVenue(line),
          snippet: line.slice(0, 250),
        });
      }

      continue;
    }

    if (
      /\b(?:journal|J\.|proceedings|proc\.|conference|workshop|symposium|annals|bulletin|review|letters|transactions|frontiers|PLOS|BMJ|JAMA|Lancet|NEJM|PubMed|Medline|Cochrane|IEEE|ACM|Nature|Science|Springer|Elsevier|Wiley|Oxford|Cambridge|Taylor|SAGE|Radiology|Oncology|Nutrients|Nutrition|Cancer|Diagnostics|Sensors|Healthcare|Access)\b/i.test(
        line,
      )
    ) {
      const key = line.slice(0, 50);

      if (!seen.has(key)) {
        seen.add(key);

        results.push({
          title: cleanTitle(line),
          authors: extractAuthors(line),
          year: extractYear(line),
          venue: extractVenue(line),
          snippet: line.slice(0, 250),
        });
      }
    }

    if (results.length >= 12) break;
  }

  if (results.length === 0) {
    for (const line of lines) {
      if (line.length < 30 || line.length > 200) continue;
      if (!/^[A-Z"]/.test(line)) continue;

      const words = line.split(/\s+/);
      if (words.length < 5 || words.length > 22) continue;
      if (/^(We|The|This|A |An |In |To |For |Our |It |There )/i.test(line))
        continue;

      const key = line.slice(0, 50);
      if (seen.has(key)) continue;
      seen.add(key);

      results.push({
        title: cleanTitle(line),
        authors: null,
        year: extractYear(line),
        venue: null,
        snippet: null,
      });

      if (results.length >= 10) break;
    }
  }

  return results.slice(0, 12);
}

function inferRole(ctx = "") {
  if (/fund|invest|grant|sponsor|financ/i.test(ctx)) return "funder";
  if (/develop|built|creat|propos|present|implement|manufactur/i.test(ctx))
    return "developer";
  if (/research|study|analyz|evaluat|experiment|conduct|perform|observ/i.test(ctx))
    return "researcher";
  return "mentioned";
}

function extractCompanies(text = "") {
  const results = [];
  const seen = new Set();

  const orgSuffixes = [
    "Inc\\.?",
    "Ltd\\.?",
    "LLC",
    "Corp\\.?",
    "Corporation",
    "Co\\.?",
    "Technologies?",
    "Systems?",
    "Solutions?",
    "Labs?",
    "Laboratory",
    "Laboratories",
    "Research",
    "AI",
    "Group",
    "Institute",
    "Institution",
    "Foundation",
    "University",
    "College",
    "School",
    "Hospital",
    "Clinic",
    "Cent(?:re|er)",
    "Agency",
    "Authority",
    "Department",
    "Ministry",
    "Council",
    "Committee",
    "Association",
    "Society",
    "Federation",
    "Organization",
    "Organisation",
    "Pharmaceuticals?",
    "Biotech",
    "Healthcare",
    "Medical",
    "Diagnostics",
  ].join("|");

  const orgRe = new RegExp(
    `\\b([A-Z][A-Za-z\\s&'\\-]{1,50}(?:\\s+(?:${orgSuffixes})))\\b`,
    "g",
  );

  let m;

  while ((m = orgRe.exec(text)) !== null) {
    const name = m[1].trim().replace(/\s+/g, " ");

    if (seen.has(name) || name.length < 4 || name.split(" ").length > 8)
      continue;

    seen.add(name);

    const ctxStart = Math.max(0, m.index - 80);
    const ctxEnd = Math.min(text.length, m.index + name.length + 80);
    const ctx = text.slice(ctxStart, ctxEnd).replace(/\s+/g, " ").trim();

    results.push({
      name,
      context: ctx,
      role: inferRole(ctx),
    });

    if (results.length >= 12) break;
  }

  const affiliationRe =
    /(?:Department of|School of|Faculty of|Division of|Institute of)\s+([A-Z][A-Za-z\s,]{5,80}?)(?:\.|,\s+[A-Z])/g;

  while ((m = affiliationRe.exec(text)) !== null) {
    const name = m[0].trim().replace(/\s+/g, " ").replace(/[,.]$/, "");

    if (seen.has(name) || name.length > 120) continue;

    seen.add(name);

    const ctxStart = Math.max(0, m.index - 60);
    const ctxEnd = Math.min(text.length, m.index + name.length + 60);
    const ctx = text.slice(ctxStart, ctxEnd).replace(/\s+/g, " ").trim();

    results.push({
      name,
      context: ctx,
      role: "researcher",
    });

    if (results.length >= 12) break;
  }

  return results.slice(0, 10);
}

function extractLocalIntel(rawText = "") {
  return {
    patents: extractPatents(rawText),
    publications: extractPublications(rawText),
    companies: extractCompanies(rawText),
  };
}

/* ─────────────────────────────────────────────────────────
   INSIGHT BUILDERS
───────────────────────────────────────────────────────── */

function extractMetrics(text = "") {
  const metricMatches = [
    ...text.matchAll(
      /([A-Za-z %()\-]{3,30})[:\s]+(\d+(\.\d+)?\s?(K|°C|ms|s|bar|atm|%|MPa|Pa|USD|m\/s)?)/g,
    ),
  ];

  return metricMatches.slice(0, 10).map((m) => ({
    label: m[1].trim(),
    value: m[2].trim(),
    context: `Extracted from document text near "${m[0].slice(0, 60)}"`,
  }));
}

function buildInsightsFromText(text = "") {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const summary = lines.slice(0, 3);
  const keyFindings = lines.slice(3, 8);
  const risks = lines
    .filter((l) => /risk|limitation|uncertain|challenge|error|sensitive/i.test(l))
    .slice(0, 5);

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
    keyFindings: keyFindings.length
      ? keyFindings
      : ["No key findings extracted"],
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

/* ─────────────────────────────────────────────────────────
   CONTROLLER
───────────────────────────────────────────────────────── */

export const uploadLocalDocument = async (req, res) => {
  let tempPath = "";

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

    const tempDir = path.join(process.cwd(), "temp");
    console.log("📂 tempDir:", tempDir);

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      console.log("✅ Temp folder created");
    }

    const safeName = req.file.originalname.replace(/\s+/g, "_");
    tempPath = path.join(tempDir, `${Date.now()}-${safeName}`);
    fs.writeFileSync(tempPath, req.file.buffer);

    console.log("💾 Temp PDF saved at:", tempPath);

    const pythonScript =
      process.env.LOCAL_EXTRACT_SCRIPT_PATH ||
      path.join(process.cwd(), "..", "ml-service", "extract_text.py");

    console.log("🐍 Python script path:", pythonScript);

    if (!fs.existsSync(pythonScript)) {
      console.log("❌ extract_text.py NOT FOUND");
      return res.status(500).json({
        error: `extract_text.py not found at ${pythonScript}`,
      });
    }

    const pythonExe =
      process.env.PYTHON_EXECUTABLE ||
      path.join(
        process.cwd(),
        "..",
        "ml-service",
        "venv",
        "Scripts",
        "python.exe",
      );

    console.log("🐍 Using Python executable:", pythonExe);

    if (
      process.env.PYTHON_EXECUTABLE &&
      !["python", "python3"].includes(process.env.PYTHON_EXECUTABLE) &&
      !fs.existsSync(pythonExe)
    ) {
      return res.status(500).json({
        error: `Python executable not found at ${pythonExe}`,
      });
    }

    console.log("🚀 Running Python extraction...");

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

    const insights = buildInsightsFromText(extractedText);
    const intel = extractLocalIntel(extractedText);

    console.log("✅ Returning JSON response");

    return res.status(200).json({
      doc: {
        id: Date.now().toString(),
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype,
        uploadedAt: new Date().toISOString(),
        rawText: extractedText,
        insights,
        intel,
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
  } finally {
    if (tempPath && fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
        console.log("🗑️ Temp file deleted");
      } catch (cleanupErr) {
        console.log("⚠️ Could not delete temp file:", cleanupErr.message);
      }
    }
  }
};