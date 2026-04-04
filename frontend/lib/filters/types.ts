export type EntityFilters = {
  patents: boolean
  papers: boolean
  companies: boolean
}
 
export type MarketReportFilters = {
  forecastOnly: boolean
  cagrOnly: boolean
  marketSizeRange: [number, number]
}
 
export type PatentDensityFilters = {
  minCount: number
  topN: number | null
}
 
export type DashboardFilters = {
  patentYearRange: [number, number]
  publicationYearRange: [number, number]
  country: string | null
  selectedCountries: string[]
 
  entities: EntityFilters
  marketReports: MarketReportFilters
  patentDensity: PatentDensityFilters
}
 
/* ---------------- DEFAULTS ---------------- */
 
export const defaultFilters: DashboardFilters = {
  patentYearRange: [2010, new Date().getFullYear()],
  publicationYearRange: [1980, new Date().getFullYear()],
  country: null,
  selectedCountries: [],
 
  entities: {
    patents: true,
    papers: true,
    companies: true,
  },
 
  marketReports: {
    forecastOnly: false,
    cagrOnly: false,
    marketSizeRange: [0, 500],
  },
 
  patentDensity: {
    minCount: 1,
    topN: null,
  },
}
 
/* ---------------- KG FILTERS ---------------- */
 
export type KGFilters = {
  nodeTypes: {
    technology: boolean
    patent: boolean
    paper: boolean
    company: boolean
    country: boolean
    source_article: boolean
  }
  relations: {
    HAS_PATENT: boolean
    HAS_PAPER: boolean
    INVOLVES_COMPANY: boolean
    FILED_IN: boolean
    LOCATED_IN: boolean
    ACTIVE_IN: boolean
 
    RELATED_WORK: boolean
    SIMILAR_PAPER: boolean
    SIMILAR_PATENT: boolean
    MENTIONED_IN: boolean
    COUNTRY_PATENT_SIGNAL: boolean
    COUNTRY_RESEARCH_SIGNAL: boolean
    }
  minDegree: number
  keyword: string | null
}
 
export const defaultKGFilters: KGFilters = {
  nodeTypes: {
    technology: true,
    patent: true,
    paper: true,
    company: true,
    country: false,
    source_article: true,
  },
  relations: {
    HAS_PATENT: true,
    HAS_PAPER: true,
    INVOLVES_COMPANY: true,
    FILED_IN: false,
    LOCATED_IN: false,
    ACTIVE_IN: true,
 
  RELATED_WORK: true,
  SIMILAR_PAPER: false,
  SIMILAR_PATENT: false,
  MENTIONED_IN: true,
  COUNTRY_PATENT_SIGNAL: false,
  COUNTRY_RESEARCH_SIGNAL: false,
  },
  minDegree: 1,
  keyword: null,
}
 
/* ---------------- COMPARE STATE ---------------- */
 
/* ---------------- TECHNOLOGY DATA ---------------- */
 
export type TechData = {
  name: string
 
  readiness: {
    trl: number
  }
 
  market: {
    sCurve: string
    size: number | null
    forecast: any[]
  }
 
  patents: {
    timeline: any[]
    list: any[]
  }
 
  publications: any[]
 
  companies: any[]
 
  knowledgeGraph: {
    nodes: any[]
    edges: any[]
  }
}
 
 
export type CompareState = {
  technologies: string[]          // ["ai", "data-science", ...]
  filters: DashboardFilters       // shared across all technologies
  kgFilters: KGFilters            // shared KG filters
}
 
export const defaultCompareState: CompareState = {
  technologies: [],
  filters: defaultFilters,
  kgFilters: defaultKGFilters,
}
 