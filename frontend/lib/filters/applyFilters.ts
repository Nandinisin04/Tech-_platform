import { DashboardFilters } from "./types"

export function applyFilters(
  dashboard: any,
  filters: DashboardFilters
) {
  if (!dashboard || !dashboard.entities) {
    return dashboard
  }

  const filtered = {
    ...dashboard,
    entities: { ...dashboard.entities },
  }

  /* ── helper: does a patent match the selected countries? ── */
  function patentMatchesCountry(p: any): boolean {
    if (filters.selectedCountries.length === 0) {
      if (filters.country) {
        const needle = filters.country.toLowerCase()
        const countryField = (
          p.country ?? p.assignee_country ?? p.filing_country ?? ""
        ).toLowerCase()
        if (countryField && countryField.includes(needle)) return true
        const text = `${p.title ?? ""} ${p.snippet ?? ""}`.toLowerCase()
        return text.includes(needle)
      }
      return true
    }

    const countryField = (
      p.country ?? p.assignee_country ?? p.filing_country ?? ""
    ).toLowerCase()

    if (countryField) {
      return filters.selectedCountries.some((c) =>
        countryField.includes(c.toLowerCase())
      )
    }

    // Fallback: text search only if no dedicated country field exists
    const text = `${p.title ?? ""} ${p.snippet ?? ""}`.toLowerCase()
    return filters.selectedCountries.some((c) =>
      text.includes(c.toLowerCase())
    )
  }

  /* ================= PATENTS ================= */
  if (filters.entities.patents && dashboard.entities?.patents) {
    filtered.entities.patents = dashboard.entities.patents.filter((p: any) => {
      if (
        typeof p.year === "number" &&
        (p.year < filters.patentYearRange[0] ||
          p.year > filters.patentYearRange[1])
      ) {
        return false
      }

      if (!patentMatchesCountry(p)) return false

      return true
    })
  } else {
    filtered.entities.patents = []
  }

  /* ================= PATENT TIMELINE ================= */
  if (dashboard.patent_timeline) {
    let timeline = [...dashboard.patent_timeline]

    timeline = timeline.filter(
      (pt) =>
        pt.year >= filters.patentYearRange[0] &&
        pt.year <= filters.patentYearRange[1]
    )

    if (filters.patentDensity.minCount > 1) {
      timeline = timeline.filter(
        (pt) => pt.count >= filters.patentDensity.minCount
      )
    }

    if (filters.patentDensity.topN) {
      timeline = timeline
        .sort((a, b) => b.count - a.count)
        .slice(0, filters.patentDensity.topN)
        .sort((a, b) => a.year - b.year)
    }

    filtered.patent_timeline = timeline
  }

  /* ================= PATENTS_COUNTRY (feeds the chart timeline) ================= */
  if (dashboard.patents_country) {
    let pc = [...dashboard.patents_country]

    // Year filter
    pc = pc.filter(
      (item: any) =>
        !item.year ||
        (item.year >= filters.patentYearRange[0] &&
          item.year <= filters.patentYearRange[1])
    )

    // Country filter
    if (filters.selectedCountries.length > 0) {
      pc = pc.filter((item: any) => {
        const c = (item.country ?? "").toLowerCase()
        return filters.selectedCountries.some((sel) =>
          c.includes(sel.toLowerCase())
        )
      })
    } else if (filters.country) {
      const needle = filters.country.toLowerCase()
      pc = pc.filter((item: any) =>
        (item.country ?? "").toLowerCase().includes(needle)
      )
    }

    filtered.patents_country = pc
  }

  /* ================= PAPERS ================= */
  // NOTE: Country filter is intentionally NOT applied to papers.
  if (filters.entities.papers && dashboard.entities.papers) {
    filtered.entities.papers = dashboard.entities.papers.filter((p: any) => {
      if (
        typeof p.year === "number" &&
        (p.year < filters.publicationYearRange[0] ||
          p.year > filters.publicationYearRange[1])
      ) {
        return false
      }
      return true
    })
  } else {
    filtered.entities.papers = []
  }

  /* ================= COMPANIES ================= */
  // NOTE: Country filter is intentionally NOT applied to companies.
  if (filters.entities.companies && dashboard.entities.companies) {
    filtered.entities.companies = dashboard.entities.companies.filter(
      (_c: any) => true
    )
  } else {
    filtered.entities.companies = []
  }   

  return filtered
}