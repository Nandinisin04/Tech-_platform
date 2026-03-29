"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { InvestmentBarChart } from "@/components/compare/investment-bar-chart";
import { MultiTechLineChart } from "@/components/compare/MultiLineChart";
import { MultiTechMarketDistribution } from "@/components/compare/MultiTechMarketDistribution";
import { UnifiedKnowledgeGraph } from "@/components/knowledge-graph/UnifiedKnowledgeGraph";
import { buildUnifiedKG } from "@/lib/knowledge-graph/buildUnifiedKG";
import { ThemeToggle } from "@/components/theme-toggle";
import { BackButton } from "@/components/back-button";

// helper to unwrap data that may be nested under latest_json
function unwrapTechData(raw: any) {
  return raw?.latest_json ? raw.latest_json : raw;
}

/* ================= TYPES ================= */

type MetricType = "trend" | "market" | "patents" | "investment" | "kg";

type TechDataMap = Record<string, any>;

/* ================= SAFE ACCESS HELPERS ================= */

function getArray(data: any, ...paths: string[][]) {
  for (const path of paths) {
    const value = path.reduce((obj: any, key: string) => obj?.[key], data);
    if (Array.isArray(value)) return value;
  }
  return [];
}

function getObject(data: any, ...paths: string[][]) {
  for (const path of paths) {
    const value = path.reduce((obj: any, key: string) => obj?.[key], data);
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
  }
  return {};
}

/* ================= NORMALIZERS ================= */
/* (kept all functions, but fixed to support your real backend shape) */

function normalizeCurve(dataMap: TechDataMap, key: string) {
  const yearSet = new Set<number | string>();
  const perTech: Record<string, Record<number | string, number>> = {};

  console.log("📈 normalizeCurve() called with key:", key);
  console.log("📈 normalizeCurve() dataMap:", dataMap);

  Object.entries(dataMap).forEach(([tech, data]) => {
    let raw: any[] = [];

    if (key === "trend_curve") {
      raw = getArray(
        data,
        ["adoption_curve"],
        ["trend_curve"],
        ["dashboard", "adoption_curve"],
        ["dashboard", "trend_curve"]
      );
    } else {
      raw = getArray(
        data,
        [key],
        ["dashboard", key]
      );
    }

    console.log(`📈 [${tech}] raw curve for ${key}:`, raw);

    if (!Array.isArray(raw)) return;
    perTech[tech] = {};

    raw.forEach((v: any, i: number) => {
      if (typeof v === "object") {
        const year = v.year ?? v.x ?? `P${i + 1}`;
        const value = v.value ?? v.count ?? v.y ?? 0;
        yearSet.add(year);
        perTech[tech][year] = Number(value) || 0;
      }

      if (typeof v === "number") {
        const year = 2020 + i;
        yearSet.add(year);
        perTech[tech][year] = v;
      }
    });
  });

  const result = Array.from(yearSet)
    .sort((a: any, b: any) => String(a).localeCompare(String(b)))
    .map((year) => {
      const row: any = { year };
      Object.keys(perTech).forEach((tech) => {
        row[tech] = perTech[tech][year] ?? null;
      });
      return row;
    });

  console.log(`📈 normalizeCurve() result for ${key}:`, result);
  return result;
}

function normalizePatentCurve(dataMap: TechDataMap) {
  const yearSet = new Set<number | string>();
  const perTech: Record<string, Record<number | string, number>> = {};

  console.log("🧠 normalizePatentCurve() dataMap:", dataMap);

  Object.entries(dataMap).forEach(([tech, data]) => {
    perTech[tech] = {};

    const timeline = getArray(
      data,
      ["patent_timeline"],
      ["paper_timeline"],
      ["dashboard", "patent_timeline"],
      ["dashboard", "paper_timeline"]
    );

    console.log(`🧠 [${tech}] patent timeline:`, timeline);

    timeline.forEach((p: any, i: number) => {
      const year = p.year ?? p.x ?? `P${i + 1}`;
      const value = p.count ?? p.value ?? p.y ?? 1;
      yearSet.add(year);
      perTech[tech][year] = (perTech[tech][year] ?? 0) + (Number(value) || 0);
    });
  });

  const result = Array.from(yearSet)
    .sort((a: any, b: any) => String(a).localeCompare(String(b)))
    .map((year) => {
      const row: any = { year };
      Object.keys(perTech).forEach((tech) => {
        row[tech] = perTech[tech][year] ?? 0;
      });
      return row;
    });

  console.log("🧠 normalizePatentCurve() result:", result);
  return result;
}

function normalizeInvestmentBars(dataMap: TechDataMap) {
  const countryMap: Record<string, any> = {};
  const techList = Object.keys(dataMap);

  console.log("💰 normalizeInvestmentBars() dataMap:", dataMap);

  Object.entries(dataMap).forEach(([tech, data]) => {
    const rawInvestment =
      getObject(
        data,
        ["country_investment"],
        ["dashboard", "country_investment"],
        ["investment_index"],
        ["dashboard", "investment_index"]
      ) || {};

    console.log(`💰 [${tech}] rawInvestment:`, rawInvestment);

    const values =
      rawInvestment?.values && typeof rawInvestment.values === "object"
        ? rawInvestment.values
        : rawInvestment;

    Object.entries(values).forEach(([country, value]: any) => {
      const c =
        country.toLowerCase().includes("united") ||
        country.toLowerCase() === "usa"
          ? "USA"
          : country;

      if (!countryMap[c]) countryMap[c] = { country: c };
      countryMap[c][tech] = Number(value) || 0;
    });
  });

  Object.values(countryMap).forEach((row: any) => {
    techList.forEach((tech) => {
      if (row[tech] === undefined) row[tech] = 0;
    });
  });

  const result = Object.values(countryMap);

  console.log("💰 normalizeInvestmentBars() result:", result);
  return result;
}

function parseMarketSizeToBillion(raw?: string): number | null {
  if (!raw) return null;
  const s = raw.toLowerCase().replace(/[$,]/g, "").trim();
  const num = parseFloat(s);
  if (isNaN(num)) return null;
  if (s.includes("trillion")) return num * 1000;
  if (s.includes("billion")) return num;
  if (s.includes("million")) return num / 1000;
  return null;
}

function normalizeMarketDistribution(dataMap: TechDataMap) {
  const result: { tech: string; points: any[] }[] = [];

  console.log("📊 normalizeMarketDistribution() dataMap:", dataMap);

  Object.entries(dataMap).forEach(([tech, data]) => {
    const points: any[] = [];

    const reports =
      data?.market_timeline ||
      data?.dashboard?.market_timeline ||
      data?.dashboard?.market_reports ||
      data?.dashboard?.entities?.market_reports ||
      [];

    console.log(`📊 [${tech}] raw market data:`, reports);

    reports.forEach((r: any, i: number) => {
      // ✅ CASE 1: timeline numeric values (NEW backend)
      if (
        r?.year !== undefined &&
        (
          r?.value !== undefined ||
          r?.market !== undefined ||
          r?.y !== undefined ||
          r?.count !== undefined
        )
      ) {
        const value = Number(r.value ?? r.market ?? r.y ?? r.count ?? 0);

        if (!isNaN(value) && value > 0) {
          points.push({
            value,
            title: `Year ${r.year}`,
            source: "timeline",
          });
        }
        return;
      }

      // ✅ CASE 2: market reports (OLD backend style)
      if (r?.market_size) {
        const value = parseMarketSizeToBillion(r.market_size);
        if (value === null) return;

        points.push({
          value,
          title: r.title || `Report ${i + 1}`,
          source: r.source || "market report",
        });
      }
    });

    console.log(`📊 [${tech}] final points:`, points);

    result.push({ tech, points });
  });

  console.log("📊 normalizeMarketDistribution() result:", result);

  return result;
}
/* ================= COMPARATIVE HELPERS ================= */

// ---- Patent signal ----
function getPatentSignal(data: any) {
  const timeline = getArray(
    data,
    ["patent_timeline"],
    ["dashboard", "patent_timeline"]
  );

  if (timeline.length === 0) return { recent: 0, growth: 0 };

  const last = timeline[timeline.length - 1]?.count ?? timeline[timeline.length - 1]?.value ?? 0;
  const prev = timeline[timeline.length - 2]?.count ?? timeline[timeline.length - 2]?.value ?? 0;
  const growth = prev > 0 ? (last - prev) / prev : last;

  return { recent: last, growth };
}

// ---- Adoption signal ----
function getAdoptionSignal(data: any) {
  const curve = getArray(
    data,
    ["adoption_curve"],
    ["trend_curve"],
    ["dashboard", "adoption_curve"],
    ["dashboard", "trend_curve"]
  );

  if (curve.length === 0) return { latest: 0, slope: 0 };

  const first =
    typeof curve[0] === "number" ? curve[0] : (curve[0]?.value ?? curve[0]?.y ?? 0);
  const last =
    typeof curve[curve.length - 1] === "number"
      ? curve[curve.length - 1]
      : (curve[curve.length - 1]?.value ?? curve[curve.length - 1]?.y ?? 0);

  return { latest: last, slope: last - first };
}

// ---- Investment signal ----
function getInvestmentSignal(data: any) {
  const valuesObj =
    getObject(
      data,
      ["country_investment"],
      ["dashboard", "country_investment"],
      ["investment_index"],
      ["dashboard", "investment_index"]
    ) || {};

  const values =
    valuesObj?.values && typeof valuesObj.values === "object"
      ? valuesObj.values
      : valuesObj;

  const nums = Object.values(values)
    .map(Number)
    .filter((v) => !isNaN(v));

  return {
    total: nums.reduce((a, b) => a + b, 0),
    breadth: nums.length,
  };
}

// ---- Market size signal ----
function getMarketSizeBillion(data: any) {
  const reports = getArray(
    data,
    ["market_timeline"],
    ["market_reports"],
    ["dashboard", "market_timeline"],
    ["dashboard", "market_reports"],
    ["dashboard", "entities", "market_reports"]
  );

  let max = 0;

  for (const r of reports) {
    if (r?.market_size) {
      const raw = r.market_size;
      const s = raw.toLowerCase().replace(/[$,]/g, "");
      const num = parseFloat(s);
      if (isNaN(num)) continue;

      if (s.includes("trillion")) max = Math.max(max, num * 1000);
      else if (s.includes("billion")) max = Math.max(max, num);
      else if (s.includes("million")) max = Math.max(max, num / 1000);
    } else {
      const val = Number(r?.value ?? r?.market ?? r?.y ?? r?.count ?? 0);
      if (!isNaN(val)) max = Math.max(max, val);
    }
  }

  return max;
}

function generateComparativeParagraphs(dataMap: TechDataMap, techs: string[]) {
  if (techs.length < 2) return null

  const entries = techs
    .map((tech) => {
      const data = dataMap[tech]
      if (!data) return null

      const patent = getPatentSignal(data)
      const adoption = getAdoptionSignal(data)
      const investment = getInvestmentSignal(data)
      const market = getMarketSizeBillion(data)

      return {
        tech,
        patent,
        adoption,
        investment,
        market,
      }
    })
    .filter(Boolean) as any[]

  if (entries.length < 2) return null

  const top3 = (arr: any[], key: (e: any) => number) =>
    [...arr].sort((a, b) => key(b) - key(a)).slice(0, 3)

  const p = top3(entries, e => e.patent.recent)
  const a = top3(entries, e => e.adoption.latest)
  const i = top3(entries, e => e.investment.total)
  const m = top3(entries, e => e.market)

  return {
    patent: `In terms of patent activity, ${p[0].tech} leads with the highest recent filing volume, indicating strong innovation momentum. ${p[1]?.tech} follows with substantial patent presence but trails the leader in recent activity, while ${p[2]?.tech} ranks next with comparatively moderate patenting intensity.`,
    adoption: `Looking at adoption trends, ${a[0].tech} demonstrates the strongest position, driven by the highest current adoption levels and consistent growth. ${a[1]?.tech} follows closely with solid adoption but slower recent acceleration, whereas ${a[2]?.tech} shows more limited uptake across use cases.`,
    investment: `From an investment perspective, ${i[0].tech} attracts the largest cumulative investment, supported by broad geographic participation. ${i[1]?.tech} remains a strong second with significant funding but a narrower investment footprint, while ${i[2]?.tech} receives comparatively lower overall investment.`,
    market: `In terms of market size, ${m[0].tech} dominates with the largest estimated market, reflecting wide commercial adoption. ${m[1]?.tech} follows with a substantial but smaller market presence, and ${m[2]?.tech} occupies a more niche position with lower overall market scale.`,
  }
}

/* ================= PAGE ================= */

export default function MultiComparePage() {
  const searchParams = useSearchParams();
  const baseTech = searchParams.get("base")?.toLowerCase() || "ai";

  const [techs, setTechs] = useState<string[]>([baseTech]);
  const [dataMap, setDataMap] = useState<TechDataMap>({});
  const [metric, setMetric] = useState<MetricType>("trend");
  const [input, setInput] = useState("");

  // confirmation state
  const [pendingSuggestion, setPendingSuggestion] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  /* ================= VALIDATED ADD ================= */
  useEffect(() => {
    async function validateBaseTech() {
      try {
        console.log("🔍 Validating baseTech:", baseTech);

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/validate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ technology: baseTech }),
          }
        );

        const data = await res.json();
        console.log("✅ Base validation response:", data);

        if (data.decision === "accept" && data.technology) {
          setTechs([data.technology]);
        } else if (data.decision === "needs_confirmation" && data.suggestion) {
          setTechs([data.suggestion]);
        } else {
          setTechs([baseTech]); // fallback
        }
      } catch (err) {
        console.error("❌ Base validation failed:", err);
        setTechs([baseTech]);
      }
    }

    validateBaseTech();
  }, [baseTech]);

  async function handleAddTech(query: string) {
    try {
      console.log("➕ Adding tech:", query);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/validate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ technology: query }),
        }
      );

      const data = await res.json();
      console.log("✅ Add tech validation response:", data);

      if (data.decision === "reject") {
        alert("This does not appear to be a technology.");
        return;
      }

      if (data.decision === "needs_confirmation") {
        setPendingSuggestion(data.suggestion);
        setShowConfirm(true);
        return;
      }

      if (!techs.includes(data.technology)) {
        setTechs((prev) => [...prev, data.technology]);
      }
    } catch (err) {
      console.error("❌ Validation failed while adding tech:", err);
      alert("Validation failed.");
    }
  }

  const removeTech = (tech: string) => {
    console.log("🗑 Removing tech:", tech);

    setTechs((prev) => prev.filter((t) => t !== tech));
    setDataMap((prev) => {
      const copy = { ...prev };
      delete copy[tech];
      return copy;
    });
  };

  /* ================= FETCH ================= */
  useEffect(() => {
    async function fetchTech(tech: string) {
      if (dataMap[tech]) {
        console.log(`⏭ Skipping fetch for ${tech}, already in dataMap`);
        return;
      }

      try {
        console.log(`🌐 Fetching tech: ${tech}`);

        let res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/technologies/${tech}`
        );

        console.log(`📡 GET /api/technologies/${tech} status:`, res.status);

        if (res.status === 404) {
          console.log(`⚙️ ${tech} not found, triggering run...`);

          await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/technologies/${tech}/run`,
            { method: "POST" }
          );

          res = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/technologies/${tech}`
          );

          console.log(`📡 Re-fetch after run for ${tech}:`, res.status);
        }

        if (!res.ok) {
          console.warn(`⚠️ Fetch failed for ${tech} with status ${res.status}`);
          return;
        }

        const json = await res.json();
        const normalized = unwrapTechData(json);

        console.log("📦 RAW TECH DATA:", tech, json);
        console.log("🧼 UNWRAPPED TECH DATA:", tech, normalized);

        setDataMap((prev) => ({
          ...prev,
          [tech]: normalized,
        }));
      } catch (err) {
        console.error(`❌ Failed to fetch ${tech}:`, err);
      }
    }

    techs.forEach((tech) => {
      fetchTech(tech);
    });
  }, [techs, dataMap]);

  console.log("🗂 DATA MAP:", dataMap);
  console.log("🧪 TECHS:", techs);
  console.log("🧪 DATA MAP KEYS:", Object.keys(dataMap));

  console.log(
    "💰 INVESTMENT RAW:",
    Object.keys(dataMap).map((t) => ({
      tech: t,
      values:
        dataMap[t]?.country_investment?.values ||
        dataMap[t]?.country_investment ||
        dataMap[t]?.dashboard?.country_investment?.values ||
        dataMap[t]?.dashboard?.country_investment,
    }))
  );

  const chartData = useMemo(() => {
    if (techs.length < 2) {
      console.log("⚠️ chartData skipped because less than 2 techs selected");
      return null;
    }

    console.log("📊 Building chartData for metric:", metric);

    switch (metric) {
      case "trend":
        return normalizeCurve(dataMap, "trend_curve");
      case "patents":
        return normalizePatentCurve(dataMap);
      case "investment":
        return normalizeInvestmentBars(dataMap);
      case "market":
        return normalizeMarketDistribution(dataMap);
      default:
        return null;
    }
  }, [dataMap, metric, techs.length]);

  const unifiedKG = useMemo(() => {
    const inputs = Object.entries(dataMap)
      .map(([tech, data]) => {
        const kg = data?.knowledge_graph || data?.dashboard?.knowledge_graph;
        return kg ? { tech, kg } : null;
      })
      .filter(Boolean) as { tech: string; kg: any }[];

    console.log("🕸 KG INPUTS:", inputs);

    if (inputs.length === 0) return null;

    const built = buildUnifiedKG(inputs);
    console.log("🕸 BUILT UNIFIED KG:", built);

    return built;
  }, [dataMap]);

  const comparativeParagraphs = useMemo(() => {
    const generated = generateComparativeParagraphs(dataMap, techs);
    console.log("📝 Comparative Paragraphs:", generated);
    return generated;
  }, [dataMap, techs]);

  const hasMarketPoints =
  metric === "market" &&
  Array.isArray(chartData) &&
  chartData.length > 0;

  console.log("📊 FINAL chartData:", chartData);
  console.log("📊 hasMarketPoints:", hasMarketPoints);
  console.log("📊 current metric:", metric);
  console.log("📦 FULL TECH DATA:", dataMap);

  /* ================= UI ================= */

  return (
    <div className="w-full">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center gap-6">
          <BackButton />
          <h1 className="text-xl font-bold">Multi-Tech Comparison</h1>

          <div className="flex-1 flex justify-center relative">
            <input
              value={input}
              placeholder="Add technology (press Enter)"
              className="border px-4 py-2 rounded-md w-full max-w-md bg-background"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && input.trim()) {
                  handleAddTech(input.trim());
                  setInput("");
                }
              }}
            />

            {showConfirm && pendingSuggestion && (
              <div className="absolute top-14 bg-background border p-4 rounded shadow z-50">
                <p className="mb-3 text-sm">
                  Did you mean <b>{pendingSuggestion}</b>?
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    className="px-3 py-1 bg-primary text-primary-foreground rounded"
                    onClick={() => {
                      console.log("✅ Confirmed suggestion:", pendingSuggestion);
                      setShowConfirm(false);
                      if (!techs.includes(pendingSuggestion)) {
                        setTechs((p) => [...p, pendingSuggestion]);
                      }
                    }}
                  >
                    Yes
                  </button>
                  <button
                    className="px-3 py-1 border rounded"
                    onClick={() => {
                      console.log("❌ Rejected suggestion:", pendingSuggestion);
                      setShowConfirm(false);
                    }}
                  >
                    No
                  </button>
                </div>
              </div>
            )}
          </div>

          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* CONTROL BAR */}
        <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 px-4 py-3">
          <div className="flex gap-1">
            {[
              { id: "trend", label: "Adoption Trend" },
              { id: "market", label: "Market Size" },
              { id: "patents", label: "Patent Activity" },
              { id: "investment", label: "Investment Index" },
              { id: "kg", label: "Knowledge Graph" },
            ].map((opt) => {
              const active = metric === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setMetric(opt.id as MetricType)}
                  className={[
                    "px-3 py-1.5 text-sm rounded-md transition",
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2 flex-wrap">
            {techs.map((t) => (
              <span key={t} className="px-3 py-1 border rounded-full text-sm">
                {t}
                {techs.length > 1 && (
                  <button
                    onClick={() => removeTech(t)}
                    className="ml-2 font-bold"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>

        {comparativeParagraphs && (
          <div className="rounded-lg border bg-card p-4 space-y-4">
            <h2 className="text-base font-semibold">
              Comparative Intelligence
            </h2>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {comparativeParagraphs.patent}
            </p>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {comparativeParagraphs.adoption}
            </p>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {comparativeParagraphs.investment}
            </p>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {comparativeParagraphs.market}
            </p>
          </div>
        )}

        {metric === "kg" ? (
          unifiedKG ? (
            <UnifiedKnowledgeGraph
              nodes={unifiedKG.nodes}
              edges={unifiedKG.edges}
            />
          ) : (
            <p className="text-muted-foreground">No KG data available.</p>
          )
        ) : !chartData ||
          chartData.length === 0 ||
          (metric === "market" && !hasMarketPoints) ? (
          <p className="text-muted-foreground">
            No data available for selected technologies.
          </p>
        ) : metric === "investment" ? (
          <InvestmentBarChart
            data={chartData as ReturnType<typeof normalizeInvestmentBars>}
          />
        ) : metric === "market" ? (
          <MultiTechMarketDistribution
            data={chartData as ReturnType<typeof normalizeMarketDistribution>}
          />
                  ) : (
          <MultiTechLineChart
            data={chartData as ReturnType<typeof normalizeCurve>}
            title={metric === "trend" ? "Adoption Trend" : "Patent Activity"}
            yLabel={metric === "trend" ? "Adoption Index" : "Patent Count"}
          />
        )}
      </main>
    </div>
  );
}