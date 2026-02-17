/* ================== ABBREVIATIONS ================== */

const ABBREVIATIONS: Record<string, string> = {
  ai: "artificial intelligence",
  ml: "machine learning",
  dl: "deep learning",
  rl: "reinforcement learning",
  agi: "artificial general intelligence",
  llm: "large language model",
  vlm: "vision language model",
  nlp: "natural language processing",
  nlu: "natural language understanding",
  nlg: "natural language generation",
  cv: "computer vision",
  gan: "generative adversarial network",
  vae: "variational autoencoder",
  diff: "diffusion model",
  genai: "generative artificial intelligence",

  etl: "extract transform load",
  bi: "business intelligence",
  dw: "data warehouse",
  oltp: "online transaction processing",
  olap: "online analytical processing",

  js: "javascript",
  ts: "typescript",
  ui: "user interface",
  ux: "user experience",
  spa: "single page application",
  pwa: "progressive web application",

  api: "application programming interface",
  grpc: "remote procedure call framework",
  orm: "object relational mapping",

  saas: "software as a service",
  paas: "platform as a service",
  iaas: "infrastructure as a service",
  faas: "function as a service",
  k8s: "kubernetes",
  iac: "infrastructure as code",
  cdn: "content delivery network",
  vpc: "virtual private cloud",

  ci: "continuous integration",
  cd: "continuous delivery",
  sre: "site reliability engineering",

  infosec: "information security",
  soc: "security operations center",
  ids: "intrusion detection system",
  ips: "intrusion prevention system",
  siem: "security information and event management",
  zta: "zero trust architecture",

  asic: "application specific integrated circuit",
  fpga: "field programmable gate array",
  soc_chip: "system on chip",
  isa: "instruction set architecture",
  hpc: "high performance computing",

  iot: "internet of things",
  iiot: "industrial internet of things",
  sdn: "software defined networking",
  nfv: "network function virtualization",

  dlt: "distributed ledger technology",
  dao: "decentralized autonomous organization",
  defi: "decentralized finance",
  nft: "non fungible token",
  zk: "zero knowledge proofs",

  qc: "quantum computing",
  qml: "quantum machine learning",
  qec: "quantum error correction",
  qnn: "quantum neural networks",

  bci: "brain computer interface",
  hri: "human robot interaction",
  crispr: "genome editing technology",
  synbio: "synthetic biology",
}

/* ================== TECH SIGNALS ================== */

const TECH_KEYWORDS: string[] = [
  "intelligence","learning","automation","optimization","prediction",
  "model","algorithm","computation","training","inference",
  "distributed","scalable","parallel","real time","autonomous",
  "secure","encrypted","privacy","trust","fault tolerant",
  "digital","virtual","augmented","cyber","robotic","neural",
  "bio","genomic","synthetic","adaptive","quantum",
]

const TECH_NOUNS: string[] = [
  "system","platform","framework","library","stack","pipeline",
  "architecture","infrastructure","network","interface",
  "protocol","engine","service","application","api",
  "database","cluster","mesh","agent","compiler",
  "runtime","kernel","firmware",
]

const TECH_SUFFIXES: string[] = [
  "ics","logy","tronics","informatics","engineering",
  "science","systems","networks","computing",
  "automation","intelligence","analytics",
  "robotics","cybernetics","sensing",
]

/* ================== CANONICAL TECHS ================== */

const CANONICAL_TECHS: string[] = [
  "artificial intelligence",
  "machine learning",
  "deep learning",
  "reinforcement learning",
  "computer vision",
  "natural language processing",
  "large language models",
  "blockchain",
  "web3",

  "web development",
  "frontend engineering",
  "react js",
  "next js",
  "single page applications",

  "backend engineering",
  "api development",
  "distributed systems",

  "data science",
  "data engineering",
  "big data analytics",
  "knowledge graphs",

  "cloud computing",
  "serverless computing",
  "devops engineering",
  "site reliability engineering",

  "cybersecurity",
  "zero trust security",
  "cryptographic systems",

  "internet of things",
  "software defined networking",
  "5g networks",

  "computer architecture",
  "embedded systems",
  "semiconductor technology",

  "autonomous systems",
  "robotics engineering",
  "human robot interaction",

  "blockchain technology",
  "distributed ledger systems",
  "decentralized finance",

  "quantum computing",
  "quantum communication",

  "bioinformatics",
  "synthetic biology",
  "brain computer interfaces",

  "aerospace systems",
  "hypersonic technology",
]

/* ================== TYPES ================== */

type ValidationResult =
  | { decision: "accept"; technology: string; confidence: number }
  | { decision: "needs_confirmation"; suggestion: string; confidence: number }
  | { decision: "reject" }

/* ================== STRING SIMILARITY ================== */

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0)
  )

  for (let i = 0; i <= a.length; i++) dp[i][0] = i
  for (let j = 0; j <= b.length; j++) dp[0][j] = j

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
    }
  }

  return dp[a.length][b.length]
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - levenshtein(a, b) / maxLen
}

/* ================== HELPERS ================== */

function normalize(q: string): string {
  return q
    .trim()
    .toLowerCase()
    .replace(/[.\-_/]/g, " ")   // next.js → next js
    .replace(/\s+/g, " ")
}

function keywordScore(q: string): number {
  const hits = TECH_KEYWORDS.filter(k => q.includes(k)).length
  return Math.min(1, hits / 2)
}

function nounSignal(q: string): boolean {
  return TECH_NOUNS.some(n => q.includes(n))
}

function suffixSignal(q: string): boolean {
  const s = q.replace(/\s+/g, "")
  return TECH_SUFFIXES.some(suf => s.endsWith(suf))
}

function fuzzyMatch(q: string): [string | null, number] {
  let bestMatch: string | null = null
  let bestScore = 0

  for (const tech of CANONICAL_TECHS) {
    const score = similarity(q, tech)
    if (score > bestScore) {
      bestScore = score
      bestMatch = tech
    }
  }

  return [bestMatch, bestScore]
}

/* ================== MAIN ================== */

export function validateTech(query: string): ValidationResult {
  const q = normalize(query)

  if (q.length < 2) return { decision: "reject" }

  /* ✅ Abbreviations */
  if (ABBREVIATIONS[q]) {
    return {
      decision: "needs_confirmation",
      suggestion: ABBREVIATIONS[q],
      confidence: 0.95,
    }
  }

  /* ✅ Exact canonical match (CRITICAL FIX) */
  if (CANONICAL_TECHS.includes(q)) {
    return {
      decision: "accept",
      technology: q,
      confidence: 1,
    }
  }

  /* ✅ Fuzzy match FIRST (smarter UX) */
  const [match, sim] = fuzzyMatch(q)

  if (sim >= 0.9 && match) {
    return {
      decision: "accept",
      technology: match,
      confidence: sim,
    }
  }

  if (sim >= 0.75 && match) {
    return {
      decision: "needs_confirmation",
      suggestion: match,
      confidence: sim,
    }
  }

  const kScore = keywordScore(q)
  const techIntent = kScore > 0 || nounSignal(q) || suffixSignal(q)

  /* ✅ Multi-word tech */
  if (techIntent && q.split(" ").length >= 2) {
    return {
      decision: "accept",
      technology: q,
      confidence: kScore || 0.6,
    }
  }

  /* ✅ Single-word tech */
  if (techIntent) {
    return {
      decision: "accept",
      technology: q,
      confidence: Math.max(kScore, sim, 0.5),
    }
  }

  return { decision: "reject" }
}