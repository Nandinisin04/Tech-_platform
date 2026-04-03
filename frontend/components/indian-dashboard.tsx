"use client";
 
import { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import * as Slider from "@radix-ui/react-slider";
import * as Select from "@radix-ui/react-select";
import { Search, ChevronDown, Check, X, SlidersHorizontal } from "lucide-react";
 
/* ─────────────────────────── Types ─────────────────────────── */
 
type SignalType = "publications" | "patents" | "investments";
 
type SignalItem = {
  title: string;
  link?: string;
  pdf_link?: string;
  year?: number;
  academic_weight?: number;
  strategic_weight?: number;
  confidence_weight?: number;
  institute?: string;
};
 
type IndiaPulseData = {
  summary: {
    publications: number;
    patents: number;
    investments: number;
  };
  signals: {
    publications: SignalItem[];
    patents: SignalItem[];
    investments: SignalItem[];
  };
};
 
const ALL_INSTITUTES = "all";
 
/* ─────────────────────── Shared sub-components ──────────────── */
 
/** Reusable year-range slider block */
function YearSlider({
  minYear,
  maxYear,
  value,
  onChange,
}: {
  minYear: number;
  maxYear: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
}) {
  return (
    <div className="w-full sm:w-52 flex-shrink-0 space-y-1.5 px-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground font-medium">Year</span>
        <span className="text-[10px] font-semibold text-foreground tabular-nums">
          {value[0]} – {value[1]}
        </span>
      </div>
      <Slider.Root
        className="relative flex items-center select-none touch-none w-full h-4"
        min={minYear}
        max={maxYear}
        step={1}
        value={value}
        onValueChange={(v) => onChange(v as [number, number])}
      >
        <Slider.Track className="bg-border relative grow rounded-full h-1">
          <Slider.Range className="absolute bg-primary rounded-full h-full" />
        </Slider.Track>
        <Slider.Thumb
          className="block w-3.5 h-3.5 bg-primary rounded-full shadow-sm border-2 border-background focus:outline-none focus:ring-2 focus:ring-primary/40 hover:scale-110 transition-transform cursor-grab active:cursor-grabbing"
          aria-label="Min year"
        />
        <Slider.Thumb
          className="block w-3.5 h-3.5 bg-primary rounded-full shadow-sm border-2 border-background focus:outline-none focus:ring-2 focus:ring-primary/40 hover:scale-110 transition-transform cursor-grab active:cursor-grabbing"
          aria-label="Max year"
        />
      </Slider.Root>
      <div className="flex justify-between text-[9px] text-muted-foreground/70">
        <span>{minYear}</span>
        <span>{maxYear}</span>
      </div>
    </div>
  );
}
 
/** Shared filter bar shell */
function FilterBar({
  label,
  hasActiveFilters,
  onReset,
  children,
}: {
  label: string;
  hasActiveFilters: boolean;
  onReset: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-muted/10 backdrop-blur-sm overflow-hidden">
      {/* header strip */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border/50">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          {label}
        </div>
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>
      {/* controls row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3">
        {children}
      </div>
    </div>
  );
}
 
/** Shared search input */
function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative flex-1 min-w-0">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
 
/** Vertical divider (desktop only) */
function VDivider() {
  return <div className="hidden sm:block h-6 w-px bg-border/60 flex-shrink-0" />;
}
 
/* ─────────────────────── Publication Filters ─────────────────── */
 
function PublicationFilters({
  publications,
  onFiltered,
}: {
  publications: SignalItem[];
  onFiltered: (filtered: SignalItem[]) => void;
}) {
  const { minYear, maxYear } = useMemo(() => {
    const years = publications
      .map((p) => p.year)
      .filter((y): y is number => typeof y === "number" && y > 1900);
    if (!years.length) return { minYear: 2000, maxYear: new Date().getFullYear() };
    return { minYear: Math.min(...years), maxYear: Math.max(...years) };
  }, [publications]);
 
  const [yearRange, setYearRange] = useState<[number, number]>([minYear, maxYear]);
  const [searchQuery, setSearchQuery] = useState("");
 
  // Re-init when bounds change (data loads)
  useEffect(() => { setYearRange([minYear, maxYear]); }, [minYear, maxYear]);
 
  // Apply filters
  useEffect(() => {
    const filtered = publications.filter((p) => {
      const year = p.year ?? 0;
      const inYear = year >= yearRange[0] && year <= yearRange[1];
      const q = searchQuery.trim().toLowerCase();
      const inSearch = !q || p.title.toLowerCase().includes(q);
      return inYear && inSearch;
    });
    onFiltered(filtered);
  }, [publications, yearRange, searchQuery, onFiltered]);
 
  const hasActiveFilters =
    yearRange[0] !== minYear || yearRange[1] !== maxYear || searchQuery.trim() !== "";
 
  function reset() {
    setYearRange([minYear, maxYear]);
    setSearchQuery("");
  }
 
  return (
    <FilterBar label="Filter Publications" hasActiveFilters={hasActiveFilters} onReset={reset}>
      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search publications…"
      />
      <VDivider />
      <YearSlider
        minYear={minYear}
        maxYear={maxYear}
        value={yearRange}
        onChange={setYearRange}
      />
    </FilterBar>
  );
}
 
/* ────────────────────────── Patent Filters ───────────────────── */
 
function PatentFilters({
  patents,
  onFiltered,
}: {
  patents: SignalItem[];
  onFiltered: (filtered: SignalItem[]) => void;
}) {
  const { minYear, maxYear } = useMemo(() => {
    const years = patents
      .map((p) => p.year)
      .filter((y): y is number => typeof y === "number" && y > 1900);
    if (!years.length) return { minYear: 2015, maxYear: new Date().getFullYear() };
    return { minYear: Math.min(...years), maxYear: Math.max(...years) };
  }, [patents]);
 
  const institutes = useMemo(() => {
    const set = new Set<string>();
    patents.forEach((p) => { if (p.institute) set.add(p.institute); });
    return Array.from(set).sort();
  }, [patents]);
 
  const [yearRange, setYearRange] = useState<[number, number]>([minYear, maxYear]);
  const [selectedInstitute, setSelectedInstitute] = useState<string>(ALL_INSTITUTES);
  const [searchQuery, setSearchQuery] = useState("");
 
  useEffect(() => { setYearRange([minYear, maxYear]); }, [minYear, maxYear]);
 
  useEffect(() => {
    const filtered = patents.filter((p) => {
      const year = p.year ?? 0;
      const inYear = year >= yearRange[0] && year <= yearRange[1];
      const inInstitute =
        selectedInstitute === ALL_INSTITUTES || p.institute === selectedInstitute;
      const q = searchQuery.trim().toLowerCase();
      const inSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        (p.institute ?? "").toLowerCase().includes(q);
      return inYear && inInstitute && inSearch;
    });
    onFiltered(filtered);
  }, [patents, yearRange, selectedInstitute, searchQuery, onFiltered]);
 
  const hasActiveFilters =
    yearRange[0] !== minYear ||
    yearRange[1] !== maxYear ||
    selectedInstitute !== ALL_INSTITUTES ||
    searchQuery.trim() !== "";
 
  function reset() {
    setYearRange([minYear, maxYear]);
    setSelectedInstitute(ALL_INSTITUTES);
    setSearchQuery("");
  }
 
  return (
    <FilterBar label="Filter Patents" hasActiveFilters={hasActiveFilters} onReset={reset}>
      {/* Search */}
      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search patents…"
      />
 
      <VDivider />
 
      {/* Institute dropdown */}
      <div className="w-full sm:w-56 flex-shrink-0">
        <Select.Root value={selectedInstitute} onValueChange={setSelectedInstitute}>
          <Select.Trigger className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition">
            <Select.Value placeholder="All Institutes" />
            <Select.Icon className="flex-shrink-0 ml-1">
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Content
              className="z-50 w-72 max-h-64 overflow-y-auto rounded-xl border border-border bg-background shadow-xl"
              position="popper"
              sideOffset={4}
            >
              <Select.Viewport className="p-1">
                <Select.Item
                  value={ALL_INSTITUTES}
                  className="flex items-center justify-between px-3 py-2 text-xs rounded-lg cursor-pointer hover:bg-muted focus:bg-muted focus:outline-none transition"
                >
                  <Select.ItemText>All Institutes</Select.ItemText>
                  <Select.ItemIndicator>
                    <Check className="w-3 h-3 text-primary" />
                  </Select.ItemIndicator>
                </Select.Item>
                <div className="my-1 border-t border-border" />
                {institutes.map((inst) => (
                  <Select.Item
                    key={inst}
                    value={inst}
                    className="flex items-center justify-between gap-2 px-3 py-2 text-xs rounded-lg cursor-pointer hover:bg-muted focus:bg-muted focus:outline-none transition"
                  >
                    <Select.ItemText>{inst}</Select.ItemText>
                    <Select.ItemIndicator className="flex-shrink-0">
                      <Check className="w-3 h-3 text-primary" />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>
 
      <VDivider />
 
      {/* Year slider */}
      <YearSlider
        minYear={minYear}
        maxYear={maxYear}
        value={yearRange}
        onChange={setYearRange}
      />
    </FilterBar>
  );
}
 
/* ─────────────────────────── Main section ───────────────────── */
 
export function IndiaPulseSection() {
  const [data, setData] = useState<IndiaPulseData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SignalType>("publications");
 
  const [filteredPatents, setFilteredPatents] = useState<SignalItem[]>([]);
  const [filteredPublications, setFilteredPublications] = useState<SignalItem[]>([]);
 
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/global/india`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
 
        // Init patents sorted
        const sortedPatents = [...(d?.signals?.patents ?? [])].sort((a, b) => {
          if ((b.year ?? 0) !== (a.year ?? 0)) return (b.year ?? 0) - (a.year ?? 0);
          return (b.strategic_weight ?? 0) - (a.strategic_weight ?? 0);
        });
        setFilteredPatents(sortedPatents);
 
        // Init publications sorted
        const sortedPubs = [...(d?.signals?.publications ?? [])].sort((a, b) => {
          if ((b.year ?? 0) !== (a.year ?? 0)) return (b.year ?? 0) - (a.year ?? 0);
          return (b.academic_weight ?? 0) - (a.academic_weight ?? 0);
        });
        setFilteredPublications(sortedPubs);
      })
      .catch(() => setError("India pulse unavailable"));
  }, []);
 
  const handleFilteredPatents = useCallback(
    (filtered: SignalItem[]) => setFilteredPatents(filtered),
    []
  );
  const handleFilteredPublications = useCallback(
    (filtered: SignalItem[]) => setFilteredPublications(filtered),
    []
  );
 
  if (error) return <p className="text-sm text-red-500 text-center">{error}</p>;
  if (!data)
    return <p className="text-muted-foreground text-center">Loading India tech pulse…</p>;
 
  // Investments: no filter, just sort
  const investmentItems = [...data.signals.investments].sort((a, b) => {
    const wa = a.confidence_weight ?? 0;
    const wb = b.confidence_weight ?? 0;
    if ((b.year ?? 0) !== (a.year ?? 0)) return (b.year ?? 0) - (a.year ?? 0);
    return wb - wa;
  });
 
  const displayItems =
    activeTab === "patents"
      ? filteredPatents
      : activeTab === "publications"
      ? filteredPublications
      : investmentItems;
 
  const showEmptyState =
    displayItems.length === 0 && (activeTab === "patents" || activeTab === "publications");
 
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mt-24 rounded-2xl border bg-background p-8 space-y-10"
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Indian Technology Advancement Metrics</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Curated signals from Indian research, patents, and startup activity.
        </p>
      </div>
 
      {/* Summary tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Stat
          label="Publications"
          value={data.summary.publications}
          active={activeTab === "publications"}
          onClick={() => setActiveTab("publications")}
        />
        <Stat
          label="Patents"
          value={data.summary.patents}
          active={activeTab === "patents"}
          onClick={() => setActiveTab("patents")}
        />
        <Stat
          label="Investments"
          value={data.summary.investments}
          active={activeTab === "investments"}
          onClick={() => setActiveTab("investments")}
        />
      </div>
 
      {/* Publication filter bar */}
      {activeTab === "publications" && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="space-y-2"
        >
          <PublicationFilters
            publications={data.signals.publications}
            onFiltered={handleFilteredPublications}
          />
          <p className="text-xs text-muted-foreground px-1">
            Showing{" "}
            <span className="font-semibold text-foreground">{filteredPublications.length}</span>
            {" "}of{" "}
            <span className="font-semibold text-foreground">{data.summary.publications}</span>
            {" "}publications
          </p>
        </motion.div>
      )}
 
      {/* Patent filter bar */}
      {activeTab === "patents" && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="space-y-2"
        >
          <PatentFilters
            patents={data.signals.patents}
            onFiltered={handleFilteredPatents}
          />
          <p className="text-xs text-muted-foreground px-1">
            Showing{" "}
            <span className="font-semibold text-foreground">{filteredPatents.length}</span>
            {" "}of{" "}
            <span className="font-semibold text-foreground">{data.summary.patents}</span>
            {" "}patents
          </p>
        </motion.div>
      )}
 
      {/* List */}
      <div
        id="india-pulse-list"
        className="grid gap-3 max-h-[420px] overflow-y-auto pr-2 scroll-smooth scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
      >
        {showEmptyState ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No {activeTab} match your filters.</p>
            <p className="text-xs mt-1">Try adjusting the year range or search term.</p>
          </div>
        ) : (
          displayItems.map((item, i) => {
            const href = item.pdf_link || item.link;
            return (
              <div
                key={i}
                className="rounded-lg px-4 py-3 bg-muted/40 hover:bg-muted transition"
              >
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block whitespace-normal break-words font-medium leading-snug hover:underline"
                  >
                    {item.title}
                  </a>
                ) : (
                  <p className="font-medium leading-snug whitespace-normal break-words">
                    {item.title}
                  </p>
                )}
                {item.institute && (
                  <p className="text-xs text-muted-foreground mt-1">{item.institute}</p>
                )}
                {item.year && (
                  <p className="text-xs text-muted-foreground">{item.year}</p>
                )}
              </div>
            );
          })
        )}
      </div>
    </motion.section>
  );
}
 
/* ───────────────────────── Stat Card ────────────────────────── */
 
function Stat({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border p-5 text-center transition focus:outline-none ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-muted/30 hover:bg-muted"
      }`}
    >
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm opacity-80 mt-1">{label}</p>
    </button>
  );
}