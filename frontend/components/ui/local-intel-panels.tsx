"use client";

import { useState } from "react";
import {
  ExternalLink,
  ChevronDown,
  ChevronUp,
  BookOpen,
  FileText,
  Building2,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────── */

export type LocalPatent = {
  title: string;
  year: number | null;
  assignee: string | null;
  patentNumber: string | null;
  snippet: string | null;
};

export type LocalPublication = {
  title: string;
  authors: string | null;
  year: number | null;
  venue: string | null;
  snippet: string | null;
};

export type LocalCompany = {
  name: string;
  context: string;
  role: "developer" | "researcher" | "funder" | "mentioned";
};

export type LocalIntel = {
  patents: LocalPatent[];
  publications: LocalPublication[];
  companies: LocalCompany[];
};

/* ─────────────────────────────────────────────────────────
   URL HELPERS
───────────────────────────────────────────────────────── */

function pubUrl(pub: LocalPublication): string {
  return `https://scholar.google.com/scholar?q=${encodeURIComponent(
    pub.title.slice(0, 120),
  )}`;
}

function patentUrl(p: LocalPatent): string {
  if (p.patentNumber)
    return `https://patents.google.com/patent/${p.patentNumber}`;
  return `https://patents.google.com/?q=${encodeURIComponent(
    p.title.slice(0, 120),
  )}`;
}

function companyUrl(c: LocalCompany): string {
  return `https://www.google.com/search?q=${encodeURIComponent(c.name)}`;
}

/* ─────────────────────────────────────────────────────────
   ROLE COLOURS
───────────────────────────────────────────────────────── */

const ROLE_COLOR: Record<LocalCompany["role"], string> = {
  developer:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  researcher:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
  funder:
    "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  mentioned: "bg-muted text-muted-foreground",
};

/* ─────────────────────────────────────────────────────────
   EXPANDABLE SNIPPET
───────────────────────────────────────────────────────── */

function ExpandableSnippet({ snippet }: { snippet: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
        {open ? "Hide content" : "Show content"}
      </button>

      {open && (
        <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed border-l-2 border-border pl-2">
          {snippet}
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   CARDS
───────────────────────────────────────────────────────── */

function PubCard({ pub }: { pub: LocalPublication }) {
  return (
    <div className="py-3 border-b border-border/30 last:border-0">
      {(pub.authors || pub.year || pub.venue) && (
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          {pub.authors && (
            <span className="text-xs text-muted-foreground truncate max-w-[240px]">
              {pub.authors}
            </span>
          )}
          {pub.year && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono shrink-0">
              {pub.year}
            </span>
          )}
          {pub.venue && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 shrink-0">
              {pub.venue}
            </span>
          )}
        </div>
      )}

      <a
        href={pubUrl(pub)}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex items-start gap-1"
      >
        <span className="text-sm font-medium leading-snug text-foreground group-hover:text-primary group-hover:underline transition-colors">
          {pub.title}
        </span>
        <ExternalLink className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </a>

      {pub.snippet && pub.snippet.length > pub.title.length + 10 && (
        <ExpandableSnippet snippet={pub.snippet} />
      )}
    </div>
  );
}

function PatentCard({ p }: { p: LocalPatent }) {
  return (
    <div className="py-3 border-b border-border/30 last:border-0">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        {p.patentNumber && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200 font-mono">
            {p.patentNumber}
          </span>
        )}
        {p.year && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
            {p.year}
          </span>
        )}
        {p.assignee && (
          <span className="text-xs text-muted-foreground">
            Assignee: <span className="text-foreground">{p.assignee}</span>
          </span>
        )}
      </div>

      <a
        href={patentUrl(p)}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex items-start gap-1"
      >
        <span className="text-sm font-medium leading-snug text-foreground group-hover:text-primary group-hover:underline transition-colors">
          {p.title}
        </span>
        <ExternalLink className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </a>

      {p.snippet && p.snippet.length > p.title.length + 10 && (
        <ExpandableSnippet snippet={p.snippet} />
      )}
    </div>
  );
}

function CompanyCard({ c }: { c: LocalCompany }) {
  return (
    <div className="py-3 border-b border-border/30 last:border-0">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <a
          href={companyUrl(c)}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-1"
        >
          <span className="text-sm font-semibold text-foreground group-hover:text-primary group-hover:underline transition-colors">
            {c.name}
          </span>
          <ExternalLink className="w-3 h-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>

        <span
          className={`text-[10px] px-2 py-0.5 rounded font-medium capitalize shrink-0 ${ROLE_COLOR[c.role]}`}
        >
          {c.role}
        </span>
      </div>

      {c.context && <ExpandableSnippet snippet={`…${c.context}…`} />}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────────────────── */

export default function LocalIntelPanels({ intel }: { intel: LocalIntel }) {
  const total =
    intel.patents.length +
    intel.publications.length +
    intel.companies.length;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold">
            Related Research Intelligence
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            Extracted from PDF
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Patents referenced · Publications cited · Companies mentioned — all
          extracted offline from your document.
        </p>
      </div>

      {total === 0 ? (
        <p className="text-xs text-muted-foreground italic py-6 text-center">
          No intelligence signals detected in this document.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/40">
          {/* ── PUBLICATIONS ── */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-semibold">Publications</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-mono ml-auto">
                {intel.publications.length}
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto pr-1">
              {intel.publications.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No publication references found.
                </p>
              ) : (
                intel.publications.map((pub, i) => <PubCard key={i} pub={pub} />)
              )}
            </div>
          </div>

          {/* ── PATENTS ── */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-semibold">Patents</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-mono ml-auto">
                {intel.patents.length}
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto pr-1">
              {intel.patents.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No patent references found.
                </p>
              ) : (
                intel.patents.map((p, i) => <PatentCard key={i} p={p} />)
              )}
            </div>
          </div>

          {/* ── COMPANIES ── */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Companies</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-mono ml-auto">
                {intel.companies.length}
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto pr-1">
              {intel.companies.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No organization names found.
                </p>
              ) : (
                intel.companies.map((c, i) => <CompanyCard key={i} c={c} />)
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}