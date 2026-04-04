"use client"
 
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DashboardFilters } from "@/lib/filters/types"
import * as Slider from "@radix-ui/react-slider"
import PublicationList from "@/components/publication-list"
import InsightsPanel from "@/components/insights-panel"
 
import {
  Building2,
  FileText,
  AlertTriangle,
  TrendingUp,
  Globe,
  ChevronDown,
  X,
  Check,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
 
/* ---------------- TYPES ---------------- */
 
type Alert = {
  type: "market" | "patent" | "tech"
  message: string
  time: string
}
 
type Company = {
  name: string
  description?: string
  importance?: "low" | "medium" | "high"
  insight?: string
  implication?: string
  evidence?: {
    title?: string
    link?: string
  }[]
}
 
type Publication = {
  title: string
  link?: string | null
}
 
type Patent = {
  title: string
  snippet?: string
  link?: string | null
  year?: number | null
  trl?: number
}
 
type SidebarPanelsProps = {
  alerts?: Alert[]
  companies?: Company[]
  publications?: Publication[]
  patents?: Patent[]
  minPatentYear: number
  maxPatentYear: number
  minPublicationYear: number
  maxPublicationYear: number
  availableCountries: string[]
  filters: DashboardFilters
  setFilters: React.Dispatch<React.SetStateAction<DashboardFilters>>
}
 
/* ---------------- COUNTRY DROPDOWN (multi-select) ---------------- */
 
function CountryDropdown({
  availableCountries,
  selectedCountries,
  onChange,
  onClear,
}: {
  availableCountries: string[]
  selectedCountries: string[]
  onChange: (country: string, checked: boolean) => void
  onClear: () => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const ref = useRef<HTMLDivElement>(null)
 
  // Close when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])
 
  const filtered = availableCountries.filter((c) =>
    c.toLowerCase().includes(search.toLowerCase())
  )
 
  const hasSelected = selectedCountries.length > 0
 
  return (
    <div ref={ref} className="relative w-full">
 
      {/* ---- Trigger button ---- */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-border bg-background text-sm hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <span className="flex items-center gap-1.5 text-muted-foreground truncate">
          <Globe className="w-3.5 h-3.5 shrink-0" />
          {hasSelected ? (
            <span className="text-foreground font-medium">
              {selectedCountries.length === 1
                ? selectedCountries[0]
                : `${selectedCountries.length} countries selected`}
            </span>
          ) : (
            <span>Select country…</span>
          )}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 text-muted-foreground transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
 
      {/* ---- Dropdown panel ---- */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
 
          {/* Search input */}
          <div className="p-2 border-b border-border">
            <input
              autoFocus
              type="text"
              placeholder="Search countries…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-2 py-1.5 text-xs rounded-sm border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
            />
          </div>
 
          {/* Options */}
          <ul className="max-h-[180px] overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-xs text-muted-foreground">
                No results
              </li>
            )}
            {filtered.map((country) => {
              const isSelected = selectedCountries.includes(country)
              return (
                <li
                  key={country}
                  onClick={() => onChange(country, !isSelected)}
                  className="flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-muted transition-colors"
                >
                  <span
                    className={
                      isSelected
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                    }
                  >
                    {country}
                  </span>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                  )}
                </li>
              )
            })}
          </ul>
 
          {/* Footer: count + clear */}
          {hasSelected && (
            <div className="border-t border-border px-3 py-2 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                {selectedCountries.length} selected
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onClear()
                }}
                className="text-[10px] text-primary hover:underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
 
      {/* ---- Selected chips below the trigger ---- */}
      {hasSelected && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedCountries.map((country) => (
            <span
              key={country}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium"
            >
              {country}
              <button
                type="button"
                onClick={() => onChange(country, false)}
                className="hover:text-destructive transition-colors"
                aria-label={`Remove ${country}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
 
/* ---------------- MAIN COMPONENT ---------------- */
 
export function SidebarPanels({
  alerts = [],
  companies = [],
  publications = [],
  patents = [],
  filters,
  setFilters,
  minPatentYear,
  maxPatentYear,
  minPublicationYear,
  maxPublicationYear,
  availableCountries = [],
}: SidebarPanelsProps) {
  const getAlertIcon = (type: Alert["type"]) => {
    switch (type) {
      case "market":
        return <TrendingUp className="w-4 h-4 text-blue-500" />
      case "patent":
        return <FileText className="w-4 h-4 text-purple-500" />
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
    }
  }
 
  const [selectedPaper, setSelectedPaper] = useState<any>(null)
 
  const handleCountryChange = (country: string, checked: boolean) => {
    setFilters((f) => ({
      ...f,
      selectedCountries: checked
        ? [...f.selectedCountries, country]
        : f.selectedCountries.filter((c) => c !== country),
    }))
  }
 
  const handleClearCountries = () => {
    setFilters((f) => ({ ...f, selectedCountries: [] }))
  }
 
  return (
    <div className="space-y-4">
 
      {/* ================= FILTERS ================= */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Filters</CardTitle>
          <CardDescription className="text-xs">
            Refine technology insights
          </CardDescription>
        </CardHeader>
 
        <CardContent className="space-y-5">
 
          {/* -------- Patent Year Range -------- */}
          <div>
            <p className="text-xs mb-2">
              Patent Year Range: {filters.patentYearRange[0]} – {filters.patentYearRange[1]}
            </p>
            <Slider.Root
              className="relative flex items-center select-none touch-none w-full h-5"
              min={minPatentYear}
              max={maxPatentYear}
              step={1}
              value={filters.patentYearRange}
              onValueChange={(value) =>
                setFilters((f) => ({
                  ...f,
                  patentYearRange: value as [number, number],
                }))
              }
            >
              <Slider.Track className="bg-muted relative grow rounded-full h-1">
                <Slider.Range className="absolute bg-primary rounded-full h-full" />
              </Slider.Track>
              <Slider.Thumb className="block w-4 h-4 bg-primary rounded-full shadow focus:outline-none focus:ring-2 focus:ring-primary" />
              <Slider.Thumb className="block w-4 h-4 bg-primary rounded-full shadow focus:outline-none focus:ring-2 focus:ring-primary" />
            </Slider.Root>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>{minPatentYear}</span>
              <span>{maxPatentYear}</span>
            </div>
          </div>
 
          {/* -------- Publication Year Range -------- */}
          <div>
            <p className="text-xs mb-2">
              Publication Year Range: {filters.publicationYearRange[0]} – {filters.publicationYearRange[1]}
            </p>
            <Slider.Root
              className="relative flex items-center select-none touch-none w-full h-5"
              min={minPublicationYear}
              max={maxPublicationYear}
              step={1}
              value={filters.publicationYearRange}
              onValueChange={(value) =>
                setFilters((f) => ({
                  ...f,
                  publicationYearRange: value as [number, number],
                }))
              }
            >
              <Slider.Track className="bg-muted relative grow rounded-full h-1">
                <Slider.Range className="absolute bg-green-500 rounded-full h-full" />
              </Slider.Track>
              <Slider.Thumb className="block w-4 h-4 bg-green-500 rounded-full shadow focus:outline-none focus:ring-2 focus:ring-green-400" />
              <Slider.Thumb className="block w-4 h-4 bg-green-500 rounded-full shadow focus:outline-none focus:ring-2 focus:ring-green-400" />
            </Slider.Root>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>{minPublicationYear}</span>
              <span>{maxPublicationYear}</span>
            </div>
          </div>
 
          {/* -------- Entity Toggles -------- */}
          <div>
            <p className="text-xs font-medium mb-2">Show Entities</p>
            {(["patents", "papers", "companies"] as const).map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm mb-1">
                <input
                  type="checkbox"
                  checked={filters.entities[key]}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      entities: {
                        ...f.entities,
                        [key]: e.target.checked,
                      },
                    }))
                  }
                />
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </label>
            ))}
          </div>
 
          {/* -------- Filter Patents by Country — Dropdown -------- */}
          {availableCountries.length > 0 && (
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Globe className="w-3 h-3 text-muted-foreground" />
                <p className="text-xs font-medium">Filter Patents by Country</p>
              </div>
              <p className="text-[10px] text-muted-foreground mb-2 leading-snug">
                Applies to patents only. Publications and companies are not affected.
              </p>
 
              <CountryDropdown
                availableCountries={availableCountries}
                selectedCountries={filters.selectedCountries}
                onChange={handleCountryChange}
                onClear={handleClearCountries}
              />
            </div>
          )}
 
        </CardContent>
      </Card>
 
      {/* ================= ALERTS ================= */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Alert Panel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {alerts.length === 0 && (
            <p className="text-xs text-muted-foreground">No alerts yet</p>
          )}
          {alerts.map((alert, i) => (
            <div
              key={i}
              className="flex gap-3 border border-border rounded-md p-3"
            >
              {getAlertIcon(alert.type)}
              <div>
                <p className="text-sm font-medium">{alert.message}</p>
                <p className="text-xs text-muted-foreground">{alert.time}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
 
      {/* ================= COMPANIES ================= */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Related Companies</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Key players in the ecosystem
          </CardDescription>
        </CardHeader>
        <CardContent className="max-h-[260px] overflow-y-auto space-y-2 pr-1">
          {companies.length === 0 && (
            <p className="text-xs text-muted-foreground">No companies available</p>
          )}
          {companies.map((company, i) => (
            <div
              key={i}
              className="p-3 rounded-lg border border-border/40 bg-secondary/20 space-y-2"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{company.name}</p>
                {company.importance && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    {company.importance.toUpperCase()}
                  </span>
                )}
              </div>
              {company.insight && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Insight:</span>{" "}
                  {company.insight}
                </p>
              )}
              {company.implication && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Why it matters:</span>{" "}
                  {company.implication}
                </p>
              )}
              {company.evidence && company.evidence.length > 0 && (
                <div className="flex flex-col gap-1">
                  {company.evidence.slice(0, 2).map((e, idx) => (
                    <a
                      key={idx}
                      href={e.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline"
                    >
                      Source: {e.title?.slice(0, 60)}...
                    </a>
                  ))}
                </div>
              )}
              {!company.insight && company.description && (
                <p className="text-xs text-muted-foreground">
                  {company.description}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
 
      {/* ================= PUBLICATIONS ================= */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-accent" />
            <CardTitle className="text-base">Publications</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Research &amp; analysis sources
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {publications.length === 0 && (
            <p className="text-xs text-muted-foreground">No publications available</p>
          )}
          <div className="max-h-[220px] overflow-y-auto pr-1">
            <PublicationList papers={publications} onSelect={setSelectedPaper} />
          </div>
          <div className="max-h-[260px] overflow-y-auto">
            <InsightsPanel paper={selectedPaper} />
          </div>
        </CardContent>
      </Card>
 
      {/* ================= PATENTS ================= */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-500" />
            <CardTitle className="text-base">Patents</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Key filed patents (ML-derived)
          </CardDescription>
        </CardHeader>
        <CardContent className="max-h-[260px] overflow-y-auto space-y-2 pr-1">
          {patents.length === 0 && (
            <p className="text-xs text-muted-foreground">No patents available</p>
          )}
          {patents.map((patent, i) => (
            <div
              key={i}
              className="p-2 rounded-md border border-border/30 bg-secondary/30"
            >
              {patent.link ? (
                <a
                  href={patent.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {patent.title}
                </a>
              ) : (
                <p className="text-sm font-medium">{patent.title}</p>
              )}
              {patent.year && (
                <p className="text-xs text-muted-foreground">
                  Year: {patent.year} · TRL: {patent.trl ?? "N/A"}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
 
    </div>
  )
}