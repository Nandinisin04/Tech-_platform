"use client";

import { useRef, useState } from "react";
import { Card, CardContent } from "frontend/components/ui/card.tsx";
import { X, Plus, Filter } from "lucide-react";

type MetricObj = { label: string; value: string; context: string };

type ScientistBrief = {
  objective: string;
  decision: string;
  methodSetup: string[];
  novelty: string;
  keyNumbers: { label: string; value: string }[];
  assumptions: string[];
  openQuestions: string[];
  risks: string[];
  actionItems: string[];
  confidence: number;
};

type Insights = {
  summary: string[];
  keyFindings: string[];
  risks: string[];
  recommendations: string[];
  metrics?: string[] | MetricObj[];
  brief?: ScientistBrief;
  tags?: string[];
  // Added timeline type
  timeline?: { date: string; event: string }[];
};
type LocalDoc = {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  insights?: Insights;
  security?: {
    storedFile: boolean;
    externalCalls: boolean;
  };
};

function normalizeMetrics(metrics?: string[] | MetricObj[]) {
  if (!metrics || metrics.length === 0)
    return { chips: [] as string[], cards: [] as MetricObj[] };

  if (typeof metrics[0] === "string") {
    return { chips: metrics as string[], cards: [] as MetricObj[] };
  }

  return { chips: [] as string[], cards: metrics as MetricObj[] };
}

function getMetricConclusion(label: string, value: string) {
  const v = value.toLowerCase();

  if (label.toLowerCase().includes("temperature")) {
    if (
      v.includes("530") ||
      v.includes("900") ||
      v.includes("1100") ||
      v.includes("700")
    ) {
      return "Conclusion: Temperature varies significantly → system is temperature-sensitive.";
    }
    return "Conclusion: Temperature strongly impacts ignition/combustion behavior.";
  }

  if (label.toLowerCase().includes("pressure")) {
    return "Conclusion: Pressure affects density, stability and feasibility.";
  }

  if (label.toLowerCase().includes("time")) {
    return "Conclusion: Microsecond-scale events → ignition/transition is very fast & critical.";
  }

  if (
    label.toLowerCase().includes("concentration") ||
    label.toLowerCase().includes("percentage")
  ) {
    return "Conclusion: Small % changes may significantly alter reaction initiation.";
  }

  return "Conclusion: Metric extracted from document context.";
}

export default function LocalDashboard() {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [docs, setDocs] = useState<LocalDoc[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<LocalDoc | null>(null);
  const [uploading, setUploading] = useState(false);

  // ✅ Tagging State
  const [activeTagFilters, setActiveTagFilters] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);

  // ✅ Computed: All unique tags across all docs
  const allTags = Array.from(
    new Set(docs.flatMap((d) => d.insights?.tags || [])),
  );

  // ✅ Filtered Docs
  const filteredDocs =
    activeTagFilters.length === 0
      ? docs
      : docs.filter((d) =>
          d.insights?.tags?.some((tag) => activeTagFilters.includes(tag)),
        );

  const { chips: metricChips, cards: metricCards } = normalizeMetrics(
    selectedDoc?.insights?.metrics,
  );

  async function handleUpload(file: File) {
    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("${process.env.NEXT_PUBLIC_BACKEND_URL}/api/local/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      console.log("UPLOAD RESPONSE JSON:", json);

      if (!res.ok) throw new Error(json?.error || "Upload failed");

      const newDoc: LocalDoc = json.doc;
      setDocs((prev) => [newDoc, ...prev]);
      setSelectedDoc(newDoc);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setUploading(false);
    }
  }

  function deleteDoc(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    const newDocs = docs.filter((d) => d.id !== id);
    setDocs(newDocs);

    if (selectedDoc?.id === id) {
      setSelectedDoc(newDocs.length > 0 ? newDocs[0] : null);
    }
  }

  function addTag(docId: string, tag: string) {
    if (!tag.trim()) return;
    const t = tag.trim();

    setDocs((prev) =>
      prev.map((d) => {
        if (d.id === docId) {
          const oldTags = d.insights?.tags || [];
          if (oldTags.includes(t)) return d;
          return {
            ...d,
            insights: {
              ...d.insights!,
              tags: [...oldTags, t],
            },
          };
        }
        return d;
      }),
    );

    // Update selectedDoc if it's the one being modified
    if (selectedDoc?.id === docId) {
      setSelectedDoc((prev) => {
        if (!prev || !prev.insights) return prev;
        const oldTags = prev.insights.tags || [];
        if (oldTags.includes(t)) return prev;
        return {
          ...prev,
          insights: {
            ...prev.insights,
            tags: [...oldTags, t],
          },
        };
      });
    }
    setNewTagInput("");
    setShowTagInput(false);
  }

  function removeTag(docId: string, tag: string) {
    setDocs((prev) =>
      prev.map((d) => {
        if (d.id === docId) {
          return {
            ...d,
            insights: {
              ...d.insights!,
              tags: d.insights?.tags?.filter((t) => t !== tag) || [],
            },
          };
        }
        return d;
      }),
    );

    if (selectedDoc?.id === docId) {
      setSelectedDoc((prev) => {
        if (!prev || !prev.insights) return prev;
        return {
          ...prev,
          insights: {
            ...prev.insights,
            tags: prev.insights.tags?.filter((t) => t !== tag) || [],
          },
        };
      });
    }
  }

  return (
    <div className="mt-5 space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Private Workspace</h2>
          <p className="text-sm text-gray-500">
            Upload internal docs securely and generate structured insights.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            🔒 Process-only mode: file not stored, no external LLM calls
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
            }}
          />

          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 rounded-xl bg-black text-white shadow disabled:opacity-60"
          >
            {uploading ? "Processing..." : "+ Upload Document"}
          </button>
        </div>
      </div>

      {/* ✅ 3 column layout for scientist use */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ✅ LEFT: LIBRARY + METRICS */}
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <h3 className="font-semibold">Document Library</h3>
            <p className="text-sm text-gray-500 mt-1">
              Uploaded PDFs will appear here.
            </p>

            <div className="mt-3 space-y-2">
              {/* Tag filtering UI removed per user request */}

              {filteredDocs.length === 0 ? (
                <p className="text-xs text-gray-400">
                  {docs.length === 0
                    ? "No documents uploaded yet."
                    : "No documents match selected filters."}
                </p>
              ) : (
                filteredDocs.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDoc(d)}
                    className={`cursor-pointer flex items-center justify-between rounded-xl border p-3 transition ${
                      selectedDoc?.id === d.id
                        ? "bg-muted"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium">{d.name}</p>
                      <p className="text-xs text-gray-500">
                        {(d.size / 1024).toFixed(1)} KB
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100">
                        PDF
                      </span>
                      <button
                        onClick={(e) => deleteDoc(e, d.id)}
                        className="p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-red-500 transition-colors"
                        title="Remove document"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* ✅ METRICS */}
            {selectedDoc && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  KEY METRICS (SELECTED DOC)
                </p>

                {metricChips.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {metricChips.map((m, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-1 rounded-full border bg-background"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                )}

                {metricCards.length > 0 && (
                  <div className="space-y-3">
                    {metricCards.slice(0, 10).map((m, i) => (
                      <div
                        key={i}
                        className="rounded-xl border p-3 bg-background"
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-sm font-semibold">
                              {m.label}
                            </span>

                            <div className="text-xs px-3 py-1.5 rounded-xl border bg-muted text-right whitespace-normal break-words max-w-[220px]">
                              {m.value}
                            </div>
                          </div>

                          <p className="text-xs text-gray-500 leading-snug">
                            {m.context}
                          </p>

                          <p className="text-[11px] text-gray-400">
                            {getMetricConclusion(m.label, m.value)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {metricChips.length === 0 && metricCards.length === 0 && (
                  <p className="text-xs text-gray-400">
                    No metrics found in this PDF.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ✅ MIDDLE: SCIENTIST BRIEF */}
        <Card className="rounded-2xl lg:col-span-1">
          <CardContent className="p-4">
            <h3 className="font-semibold">Scientist Brief (1-Page)</h3>
            <p className="text-sm text-gray-500 mt-1">
              Structured internal note generated fully offline.
            </p>

            {!selectedDoc?.insights?.brief ? (
              <div className="mt-3 text-xs text-gray-400">
                Upload a document to generate a scientist brief…
              </div>
            ) : (
              <div className="mt-4 space-y-4 text-sm">
                <div className="text-xs text-gray-500">
                  ✅ Stored file:{" "}
                  <span className="font-medium">
                    {String(selectedDoc.security?.storedFile ?? false)}
                  </span>{" "}
                  | ✅ External calls:{" "}
                  <span className="font-medium">
                    {String(selectedDoc.security?.externalCalls ?? false)}
                  </span>
                </div>

                {/* Objective */}
                <BriefBlock title="OBJECTIVE">
                  <p className="text-sm">
                    {selectedDoc.insights.brief.objective}
                  </p>
                </BriefBlock>

                {/* Method */}
                <BriefBlock title="METHOD / SETUP">
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {selectedDoc.insights.brief.methodSetup?.length ? (
                      selectedDoc.insights.brief.methodSetup.map((x, i) => (
                        <li key={i}>{x}</li>
                      ))
                    ) : (
                      <li className="text-gray-400">Not extracted</li>
                    )}
                  </ul>
                </BriefBlock>

                {/* Novelty */}
                <BriefBlock title="NOVELTY / CONTRIBUTION">
                  <p className="text-sm">
                    {selectedDoc.insights.brief.novelty}
                  </p>
                </BriefBlock>

                {/* Key Numbers */}
                <BriefBlock title="KEY NUMBERS">
                  <div className="flex flex-wrap gap-2">
                    {selectedDoc.insights.brief.keyNumbers?.length ? (
                      selectedDoc.insights.brief.keyNumbers.map((m, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-1 rounded-full border bg-background"
                          title={m.label}
                        >
                          <span className="font-medium">{m.label}:</span>{" "}
                          {m.value}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400">
                        No key numbers extracted
                      </span>
                    )}
                  </div>
                </BriefBlock>

                {/* Assumptions */}
                <BriefBlock title="ASSUMPTIONS">
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {selectedDoc.insights.brief.assumptions?.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </BriefBlock>

                {/* Risks */}
                <BriefBlock title="RISKS / GAPS">
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {selectedDoc.insights.brief.risks?.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </BriefBlock>

                {/* Action items */}
                <BriefBlock title="ACTION ITEMS (NEXT STEPS)">
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {selectedDoc.insights.brief.actionItems?.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </BriefBlock>

                {/* Confidence */}
                <BriefBlock title="EXTRACTION CONFIDENCE">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Offline confidence score
                    </p>
                    <span className="text-sm font-semibold">
                      {selectedDoc.insights.brief.confidence}%
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Heuristic score based on extracted signals (metrics +
                    high-value sentences).
                  </p>
                </BriefBlock>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ✅ RIGHT: INSIGHTS */}
        <Card className="rounded-2xl lg:col-span-1">
          <CardContent className="p-4">
            <h3 className="font-semibold">Generated Insights</h3>
            <p className="text-sm text-gray-500 mt-1">
              Summary • Key Findings • Risks • Recommendations
            </p>

            {!selectedDoc?.insights ? (
              <div className="mt-3 text-xs text-gray-400">
                Upload a document to generate insights…
              </div>
            ) : (
              <div className="mt-4 space-y-4 text-sm">
                <Section title="SUMMARY" items={selectedDoc.insights.summary} />

                {/* ✅ TAGS (Below Summary) */}
                <div className="mt-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-muted-foreground">
                      TAGS
                    </p>
                    <button
                      onClick={() => setShowTagInput(!showTagInput)}
                      className="text-[10px] flex items-center gap-1 hover:text-primary transition"
                    >
                      <Plus className="w-3 h-3" /> Add Tag
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {/* Show Input */}
                    {showTagInput && (
                      <div className="flex items-center gap-1 animate-in fade-in zoom-in duration-200">
                        <input
                          autoFocus
                          className="text-xs border rounded px-2 py-1 h-6 w-24"
                          placeholder="New tag..."
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              addTag(selectedDoc.id, newTagInput);
                          }}
                        />
                        <button
                          onClick={() => addTag(selectedDoc.id, newTagInput)}
                          className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded h-6"
                        >
                          Add
                        </button>
                      </div>
                    )}

                    {/* List Tags */}
                    {(selectedDoc.insights.tags || []).map((tag, i) => (
                      <span
                        key={i}
                        className="group flex items-center gap-1 text-xs px-2 py-1 rounded-full border bg-zinc-50 dark:bg-zinc-900"
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(selectedDoc.id, tag)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}

                    {(!selectedDoc.insights.tags ||
                      selectedDoc.insights.tags.length === 0) &&
                      !showTagInput && (
                        <span className="text-xs text-gray-400 italic">
                          No tags added.
                        </span>
                      )}
                  </div>
                </div>

                {/* ✅ TIMELINE VIEW */}
                {selectedDoc.insights.timeline &&
                  selectedDoc.insights.timeline.length > 0 && (
                    <div className="mt-6 mb-6">
                      <p className="text-xs font-semibold text-muted-foreground mb-3">
                        TIMELINE
                      </p>
                      <div className="relative border-l border-muted ml-2 space-y-6">
                        {selectedDoc.insights.timeline.map((item, i) => (
                          <div key={i} className="ml-4 relative">
                            {/* Dot */}
                            <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary border border-background"></div>

                            {/* Date */}
                            <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground mb-1">
                              {item.date}
                            </span>

                            {/* Event Text */}
                            <p className="text-xs text-gray-700 dark:text-gray-300 leading-snug">
                              {item.event}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                <Section
                  title="KEY FINDINGS"
                  items={selectedDoc.insights.keyFindings}
                />
                <Section title="RISKS" items={selectedDoc.insights.risks} />
                <Section
                  title="RECOMMENDATIONS"
                  items={selectedDoc.insights.recommendations}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function BriefBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-background p-3">
      <p className="text-xs font-semibold text-muted-foreground mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground mb-2">
        {title}
      </p>
      <ul className="list-disc pl-5 space-y-1">
        {items?.length ? (
          items.map((s, i) => <li key={i}>{s}</li>)
        ) : (
          <li className="text-gray-400">No data found</li>
        )}
      </ul>
    </div>
  );
}
