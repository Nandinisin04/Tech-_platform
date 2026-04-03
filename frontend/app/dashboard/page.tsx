"use client";
import React from "react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard-header";
import { KeyInsightsCards } from "@/components/key-insights-cards";
import { VisualizationArea } from "@/components/visualization-area";
import { SidebarPanels } from "@/components/sidebar-panels";
import { KnowledgeGraph } from "@/components/knowledge-graph";
import { applyFilters } from "@/lib/filters/applyFilters";
import { defaultFilters, DashboardFilters } from "@/lib/filters/types";
import { defaultKGFilters, KGFilters } from "@/lib/filters/types";
import { ThemeToggle } from "@/components/theme-toggle";
import { filterKnowledgeGraph } from "@/lib/filters/filterKnowledgeGraph";
import ModeToggle from "@/components/ui/mode-toggle";
import LocalDashboard from "@/components/ui/local-dashboard";

function applyPreset(
  f: KGFilters,
  nodeTypes: Partial<KGFilters["nodeTypes"]>,
  enabledRelations: string[],
): KGFilters {
  return {
    ...f,
    nodeTypes: {
      ...f.nodeTypes,
      ...Object.fromEntries(Object.keys(f.nodeTypes).map((k) => [k, false])),
      ...nodeTypes,
    },
    relations: {
      ...defaultKGFilters.relations,
      ...(Object.fromEntries(enabledRelations.map((r) => [r, true])) as Partial<
        KGFilters["relations"]
      >),
    },
    minDegree: f.minDegree,
    keyword: f.keyword,
  };
}

function FilterPill({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-background p-3 shadow-sm">
      <p className="text-xs font-semibold text-muted-foreground mb-2">
        {title}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

const RELATION_LABELS: Record<string, string> = {
  HAS_PATENT: "Tech → Patents",
  HAS_PAPER: "Tech → Papers",
  INVOLVES_COMPANY: "Tech → Articles (Company Sources)",
  FILED_IN: "Patent → Country",
  PUBLISHED_IN: "Paper → Country",
  LOCATED_IN: "Company → Country",
  ACTIVE_IN: "Tech → Active Countries",
  MENTIONED_IN: "Tech → Mentioned in Articles",
  RELATED_WORK: "Patent ↔ Paper Bridge",
  SIMILAR_PAPER: "Paper ↔ Similar Paper",
  SIMILAR_PATENT: "Patent ↔ Similar Patent",
  COUNTRY_PATENT_SIGNAL: "Paper → Country (Patent Signal)",
  COUNTRY_RESEARCH_SIGNAL: "Paper → Country (Research Signal)",
};

function ChipButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 text-xs rounded-full border bg-background hover:bg-muted transition"
    >
      {label}
    </button>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-3 h-3 rounded-full ${color}`} />
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const techParam = searchParams.get("tech") || "hypersonics";

  const techName = techParam.toLowerCase().trim();
  const normalizedTech = techName.replace(/\s+/g, "_");

  const [data, setData] = useState<any>(null); // dashboard block only
  const [kg, setKg] = useState<any>(null); // knowledge_graph block
  const [showKG, setShowKG] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>(defaultFilters);
  const [kgFilters, setKgFilters] = useState<KGFilters>(defaultKGFilters);
  const [loadingMessage, setLoadingMessage] = useState("Loading analysis data...");

  useEffect(() => {
    let cancelled = false;

    async function loadTech() {
      try {
        setError(null);
        setData(null);
        setKg(null);
        setLoadingMessage("Loading analysis data...");

        const encodedTech = encodeURIComponent(normalizedTech);

        console.log("🔍 FRONTEND FETCHING:", normalizedTech);

        // 1️⃣ Try cached DB data first
        let res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/technologies/${encodedTech}`
        );

        console.log(`📡 GET /api/technologies/${encodedTech} status:`, res.status);

        // 2️⃣ If not found, trigger ML pipeline
        if (res.status === 404) {
          console.warn("⚠️ Not in DB, running ML pipeline for:", normalizedTech);
          setLoadingMessage(`Generating intelligence for ${normalizedTech.replace(/_/g, " ")}...`);

          const runRes = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/technologies/${encodedTech}/run`,
            {
              method: "POST",
            }
          );

          console.log(`🚀 POST /run status for ${normalizedTech}:`, runRes.status);

          if (!runRes.ok) {
            const errJson = await runRes.json().catch(() => null);
            console.error("❌ ML pipeline failed response:", errJson);
            throw new Error(errJson?.error || "ML pipeline failed");
          }

          // 3️⃣ Fetch again after ML finishes
          res = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/technologies/${encodedTech}`
          );

          console.log(`📡 Re-fetch after pipeline for ${normalizedTech}:`, res.status);
        }

        if (!res.ok) {
          throw new Error(`Technology data not available (${res.status})`);
        }

        const json = await res.json();

        console.log("✅ DASHBOARD RAW RESPONSE:", json);

        // ✅ STRICT EXPECTED SHAPE:
        // {
        //   dashboard: {...},
        //   knowledge_graph: {...},
        //   source: ...
        // }

        const dashboardBlock = json?.dashboard ?? null;
        const knowledgeGraphBlock = json?.knowledge_graph ?? null;

        console.log("📦 dashboardBlock:", dashboardBlock);
        console.log("🕸 knowledgeGraphBlock:", knowledgeGraphBlock);

        if (!dashboardBlock) {
          throw new Error("Malformed response: missing dashboard block");
        }

        if (!cancelled) {
          setData(dashboardBlock);
          setKg(knowledgeGraphBlock);
        }
      } catch (err: any) {
        console.error("❌ Dashboard load error:", err);
        if (!cancelled) {
          setError(err?.message || "Technology data not available");
        }
      }
    }

    loadTech();

    return () => {
      cancelled = true;
    };
  }, [normalizedTech]);

  // Auto-set patent year range from patents entity
  useEffect(() => {
    if (!data?.entities?.patents?.length) return;

    const years = data.entities.patents
      .map((p: any) => p.year)
      .filter((y: any) => typeof y === "number");

    if (!years.length) return;

    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    console.log("📅 Patent year range auto-detected:", { minYear, maxYear });

    setFilters((prev) => ({
      ...prev,
      patentYearRange: [minYear, maxYear],
    }));
  }, [data]);

  const filteredData = useMemo(() => {
    if (!data) return null;
    const result = applyFilters(data, filters);
    console.log("🧪 filteredData:", result);
    return result;
  }, [data, filters]);

  const patentYears = useMemo(() => {
    if (!data?.patent_timeline?.length) return [];
    return data.patent_timeline
      .map((p: any) => p.year)
      .filter((y: any) => typeof y === "number");
  }, [data]);

  const minPatentYear =
    patentYears.length > 0 ? Math.min(...patentYears) : 2010;

  const maxPatentYear =
    patentYears.length > 0
      ? Math.max(...patentYears)
      : new Date().getFullYear();

  const filteredKG = useMemo(() => {
    if (!kg) return null;
    const result = filterKnowledgeGraph(kg, kgFilters);
    console.log("🕸 filteredKG:", result);
    return result;
  }, [kg, kgFilters]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  if (!filteredData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">{loadingMessage}</p>
      </div>
    );
  }

  console.log("📊 FINAL DASHBOARD DATA:", data);

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          {/* LEFT SIDE */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-primary">
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back</span>
            </Link>
            <h1 className="text-2xl font-bold">TechIntel</h1>
          </div>

          {/* RIGHT SIDE */}
          <div className="flex items-center">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        <DashboardHeader techName={techName.replace(/_/g, " ")} />
        <p>{filteredData.overview?.text}</p>
        <KeyInsightsCards insights={filteredData.insights} />

        {/* MAIN CONTENT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: ALL CHARTS */}
          <div className="lg:col-span-2">
            <VisualizationArea
              trendCurve={filteredData.trend_curve ?? []}
              countryInvestment={filteredData.country_investment?.values ?? {}}
              patentTimeline={filteredData.patent_timeline ?? []}
              patentsCountry={filteredData.patents_country ?? []}
              marketReports={filteredData.entities?.market_reports ?? []}
            />

            {/* Knowledge Graph */}
            {kg && kg.nodes?.length > 0 && (
              <div className="mt-6 rounded-xl border bg-card p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold">Knowledge Graph</h2>

                  <button
                    onClick={() => setShowKG(!showKG)}
                    className="px-3 py-1.5 text-xs rounded-md border bg-background hover:bg-muted transition"
                  >
                    {showKG ? "Hide Graph" : "Show Graph"}
                  </button>
                </div>

                {showKG && (
                  <>
                    {/* Node Legend */}
                    <div className="flex flex-wrap gap-4 mb-4 text-xs text-muted-foreground">
                      <LegendItem color="bg-sky-300" label="Technology" />
                      <LegendItem color="bg-blue-600" label="Patent" />
                      <LegendItem color="bg-green-200" label="Paper" />
                      <LegendItem color="bg-pink-300" label="Country" />
                      <LegendItem color="bg-yellow-400" label="Source Article" />
                    </div>

                    {/* Layout: Graph Left + Controls Right */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                      {/* LEFT = Graph */}
                      <div className="lg:col-span-3 h-[520px] w-full overflow-hidden rounded-md border bg-background">
                        {filteredKG && (
                          <KnowledgeGraph
                            nodes={filteredKG.nodes}
                            edges={filteredKG.edges}
                          />
                        )}
                      </div>

                      {/* RIGHT = Controls Panel */}
                      <div className="lg:col-span-1 space-y-3">
                        {/* Analyst Questions */}
                        <FilterPill title="ANALYST QUESTIONS">
                          <div className="flex flex-wrap gap-2">
                            <ChipButton
                              label="🌍 Active Countries"
                              onClick={() =>
                                setKgFilters((f) =>
                                  applyPreset(
                                    f,
                                    { technology: true, country: true },
                                    ["ACTIVE_IN"],
                                  ),
                                )
                              }
                            />

                            <ChipButton
                              label="🔗 Patent ↔ Paper Bridges"
                              onClick={() =>
                                setKgFilters((f) =>
                                  applyPreset(
                                    f,
                                    {
                                      technology: true,
                                      patent: true,
                                      paper: true,
                                    },
                                    ["RELATED_WORK", "HAS_PATENT", "HAS_PAPER"],
                                  ),
                                )
                              }
                            />

                            <ChipButton
                              label="📄 Similar Papers"
                              onClick={() =>
                                setKgFilters((f) =>
                                  applyPreset(f, { paper: true }, [
                                    "SIMILAR_PAPER",
                                  ]),
                                )
                              }
                            />

                            <ChipButton
                              label="🧩 Similar Patents"
                              onClick={() =>
                                setKgFilters((f) =>
                                  applyPreset(f, { patent: true }, [
                                    "SIMILAR_PATENT",
                                  ]),
                                )
                              }
                            />
                          </div>
                        </FilterPill>

                        {/* Node Type Filters */}
                        <FilterPill title="NODE TYPES">
                          <div className="grid grid-cols-1 gap-2 text-xs">
                            {Object.entries(kgFilters.nodeTypes).map(
                              ([key, value]) => (
                                <label
                                  key={key}
                                  className="flex items-center gap-2 capitalize"
                                >
                                  <input
                                    type="checkbox"
                                    checked={value}
                                    onChange={(e) =>
                                      setKgFilters((f) => ({
                                        ...f,
                                        nodeTypes: {
                                          ...f.nodeTypes,
                                          [key]: e.target.checked,
                                        },
                                      }))
                                    }
                                  />
                                  {key.replaceAll("_", " ")}
                                </label>
                              ),
                            )}
                          </div>
                        </FilterPill>

                        {/* Relation Filters */}
                        <FilterPill title="RELATION TYPES">
                          <div className="grid grid-cols-1 gap-2 text-xs max-h-[180px] overflow-auto pr-1">
                            {Object.entries(kgFilters.relations).map(
                              ([key, value]) => (
                                <label
                                  key={key}
                                  className="flex items-center gap-2"
                                >
                                  <input
                                    type="checkbox"
                                    checked={value}
                                    onChange={(e) =>
                                      setKgFilters((f) => ({
                                        ...f,
                                        relations: {
                                          ...f.relations,
                                          [key]: e.target.checked,
                                        },
                                      }))
                                    }
                                  />
                                  {RELATION_LABELS[key] ??
                                    key.replaceAll("_", " ")}
                                </label>
                              ),
                            )}
                          </div>
                        </FilterPill>

                        {/* Reset */}
                        <button
                          onClick={() => setKgFilters(defaultKGFilters)}
                          className="w-full px-3 py-2 text-xs rounded-md border bg-background hover:bg-muted transition"
                        >
                          Reset Filters
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: SIDEBAR */}
          {filteredData && (
            <SidebarPanels
              alerts={filteredData.alerts ?? []}
              companies={filteredData.entities?.companies ?? []}
              publications={filteredData.entities?.papers ?? []}
              patents={filteredData.entities?.patents ?? []}
              filters={filters}
              minPatentYear={minPatentYear}
              maxPatentYear={maxPatentYear}
              setFilters={setFilters}
            />
          )}
        </div>
      </div>
    </main>
  );
}

type Mode = "technology" | "local";

export default function DashboardPage() {
  const [mode, setMode] = useState<Mode>("technology");

  useEffect(() => {
    const saved = localStorage.getItem("intel_mode") as Mode | null;
    if (saved === "technology" || saved === "local") setMode(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("intel_mode", mode);
  }, [mode]);

  return (
    <div className="min-h-screen">
      {/* TOP MINI BAR FOR TOGGLE */}
      <div className="sticky top-0 z-[999] border-b bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Mode Switch
          </h2>

          <ModeToggle mode={mode} setMode={setMode} />
        </div>
      </div>

      {/* MODE CONTENT */}
      {mode === "technology" ? (
        <Suspense fallback={<p className="p-6">Loading dashboard...</p>}>
          <DashboardContent />
        </Suspense>
      ) : (
        <LocalDashboard />
      )}
    </div>
  );
}