"use client";

import { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { X, Plus } from "lucide-react";
import LocalIntelPanels from "@/components/ui/local-intel-panels";

type MetricObj = {
  label: string;
  value: string;
  context: string;
  conclusion?: string;
};

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
  timeline?: { date: string; event: string }[];
};

type LocalPatent = {
  title: string;
  year: number | null;
  assignee: string | null;
  patentNumber: string | null;
  snippet: string | null;
};

type LocalPublication = {
  title: string;
  authors: string | null;
  year: number | null;
  venue: string | null;
  snippet: string | null;
};

type LocalCompany = {
  name: string;
  context: string;
  role: "developer" | "researcher" | "funder" | "mentioned";
};

type LocalIntel = {
  patents: LocalPatent[];
  publications: LocalPublication[];
  companies: LocalCompany[];
};

type LocalDoc = {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  rawText?: string;
  insights?: Insights;
  intel?: LocalIntel;
  security?: {
    storedFile: boolean;
    externalCalls: boolean;
  };
};

function normalizeMetrics(metrics?: string[] | MetricObj[]) {
  if (!metrics || metrics.length === 0) {
    return { chips: [] as string[], cards: [] as MetricObj[] };
  }

  if (typeof metrics[0] === "string") {
    return { chips: metrics as string[], cards: [] as MetricObj[] };
  }

  return { chips: [] as string[], cards: metrics as MetricObj[] };
}

export default function LocalDashboard() {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [docs, setDocs] = useState<LocalDoc[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<LocalDoc | null>(null);
  const [uploading, setUploading] = useState(false);

  // UI-only tag state
  const [newTagInput, setNewTagInput] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);

  const { chips: metricChips, cards: metricCards } = normalizeMetrics(
    selectedDoc?.insights?.metrics,
  );

  async function handleUpload(file: File) {
    try {
      setUploading(true);

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      if (!backendUrl) {
        throw new Error("NEXT_PUBLIC_BACKEND_URL is not configured");
      }

      const formData = new FormData();
      formData.append("file", file);

      console.log("📤 Uploading local file:", file.name);

      const res = await fetch(`${backendUrl}/api/local/upload`, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      console.log("📥 LOCAL UPLOAD RESPONSE:", json);

      if (!res.ok) {
        throw new Error(json?.error || "Upload failed");
      }

      const newDoc: LocalDoc = json.doc;
      setDocs((prev) => [newDoc, ...prev]);
      setSelectedDoc(newDoc);
    } catch (e: any) {
      console.error("❌ Local upload failed:", e);
      alert(e.message || "Upload failed");
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
    const cleanTag = tag.trim();

    setDocs((prev) =>
      prev.map((d) => {
        if (d.id !== docId) return d;

        const oldTags = d.insights?.tags || [];
        if (oldTags.includes(cleanTag)) return d;

        return {
          ...d,
          insights: {
            ...d.insights!,
            tags: [...oldTags, cleanTag],
          },
        };
      }),
    );

    if (selectedDoc?.id === docId) {
      setSelectedDoc((prev) => {
        if (!prev || !prev.insights) return prev;

        const oldTags = prev.insights.tags || [];
        if (oldTags.includes(cleanTag)) return prev;

        return {
          ...prev,
          insights: {
            ...prev.insights,
            tags: [...oldTags, cleanTag],
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
        if (d.id !== docId) return d;

        return {
          ...d,
          insights: {
            ...d.insights!,
            tags: d.insights?.tags?.filter((t) => t !== tag) || [],
          },
        };
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
      {/* Header */}
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

      {/* Main 3-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT: DOCUMENT LIBRARY + METRICS */}
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <h3 className="font-semibold">Document Library</h3>
            <p className="text-sm text-gray-500 mt-1">
              Uploaded PDFs will appear here.
            </p>

            <div className="mt-3 space-y-2">
              {docs.length === 0 ? (
                <p className="text-xs text-gray-400">
                  No documents uploaded yet.
                </p>
              ) : (
                docs.map((d) => (
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
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-black">
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

            {/* METRICS */}
            {selectedDoc && (
              <div className="mt-5">
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
                            {m.conclusion || "Conclusion not available."}
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

        {/* MIDDLE: SCIENTIST BRIEF */}
        <Card className="rounded-2xl">
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

                <BriefBlock title="OBJECTIVE">
                  <p>{selectedDoc.insights.brief.objective}</p>
                </BriefBlock>

                <BriefBlock title="METHOD / SETUP">
                  <ul className="list-disc pl-5 space-y-1">
                    {selectedDoc.insights.brief.methodSetup?.length ? (
                      selectedDoc.insights.brief.methodSetup.map((x, i) => (
                        <li key={i}>{x}</li>
                      ))
                    ) : (
                      <li className="text-gray-400">Not extracted</li>
                    )}
                  </ul>
                </BriefBlock>

                <BriefBlock title="NOVELTY / CONTRIBUTION">
                  <p>{selectedDoc.insights.brief.novelty}</p>
                </BriefBlock>

                <BriefBlock title="KEY NUMBERS">
                  <div className="flex flex-wrap gap-2">
                    {selectedDoc.insights.brief.keyNumbers?.length ? (
                      selectedDoc.insights.brief.keyNumbers.map((m, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-1 rounded-full border bg-background"
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

                <BriefBlock title="ASSUMPTIONS">
                  <ul className="list-disc pl-5 space-y-1">
                    {selectedDoc.insights.brief.assumptions?.length ? (
                      selectedDoc.insights.brief.assumptions.map((x, i) => (
                        <li key={i}>{x}</li>
                      ))
                    ) : (
                      <li className="text-gray-400">No assumptions extracted</li>
                    )}
                  </ul>
                </BriefBlock>

                <BriefBlock title="RISKS / GAPS">
                  <ul className="list-disc pl-5 space-y-1">
                    {selectedDoc.insights.brief.risks?.length ? (
                      selectedDoc.insights.brief.risks.map((x, i) => (
                        <li key={i}>{x}</li>
                      ))
                    ) : (
                      <li className="text-gray-400">No risks extracted</li>
                    )}
                  </ul>
                </BriefBlock>

                <BriefBlock title="ACTION ITEMS (NEXT STEPS)">
                  <ul className="list-disc pl-5 space-y-1">
                    {selectedDoc.insights.brief.actionItems?.length ? (
                      selectedDoc.insights.brief.actionItems.map((x, i) => (
                        <li key={i}>{x}</li>
                      ))
                    ) : (
                      <li className="text-gray-400">
                        No action items extracted
                      </li>
                    )}
                  </ul>
                </BriefBlock>

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
                    Heuristic score based on extracted signals.
                  </p>
                </BriefBlock>
              </div>
            )}
          </CardContent>
        </Card>

        {/* RIGHT: GENERATED INSIGHTS */}
        <Card className="rounded-2xl">
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

                {/* TAGS */}
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

                {/* TIMELINE */}
                {selectedDoc.insights.timeline &&
                  selectedDoc.insights.timeline.length > 0 && (
                    <div className="mt-6 mb-6">
                      <p className="text-xs font-semibold text-muted-foreground mb-3">
                        TIMELINE
                      </p>
                      <div className="relative border-l border-muted ml-2 space-y-6">
                        {selectedDoc.insights.timeline.map((item, i) => (
                          <div key={i} className="ml-4 relative">
                            <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary border border-background"></div>
                            <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground mb-1">
                              {item.date}
                            </span>
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

      {/* FULL-WIDTH ROW: Document Intelligence — Publications, Patents, Companies */}
      {selectedDoc?.intel && <LocalIntelPanels intel={selectedDoc.intel} />}
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