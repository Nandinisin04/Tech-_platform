/* ================== ABBREVIATIONS ================== */



const ABBREVIATIONS: Record<string, string> = {
  ai: "artificial intelligence",
  ml: "machine learning",
  dl: "deep learning",
  rl: "reinforcement learning",
  llm: "large language model",
  nlp: "natural language processing",
  cv: "computer vision",
  av: "autonomous vehicles",
  hyp: "hypersonic technology",
  vlm: "vision language model",
  gan: "generative adversarial network",
  vae: "variational autoencoder",
  diff: "diffusion model",
  sd: "stable diffusion",
  nlu: "natural language understanding",
  nlg: "natural language generation",
  mt: "machine translation",
  asr: "automatic speech recognition",
  tts: "text to speech",
  os: "operating systems",
  dbms: "database management systems",
  rdbms: "relational database management systems",
  nosql: "non relational databases",
  saas: "software as a service",
  paas: "platform as a service",
  iaas: "infrastructure as a service",
  faas: "function as a service",
  k8s: "kubernetes",
  iac: "infrastructure as code",
  infosec: "information security",
  ids: "intrusion detection system",
  ips: "intrusion prevention system",
  dlt: "distributed ledger technology",
  dao: "decentralized autonomous organization",
  defi: "decentralized finance",
  asic: "application specific integrated circuit",
  fpga: "field programmable gate array",
  soc: "system on chip",
  bci: "brain computer interface",
  qec: "quantum error correction",
  qc: "quantum computing",
  qml: "quantum machine learning",
  qnn: "quantum neural networks",
  hri: "human robot interaction",

}

/* ================== TECH SIGNALS ================== */

const TECH_KEYWORDS: string[] = [
  "learning","intelligence","network","system","algorithm","model",
  "computing","technology","quantum","cyber","robot","neural",
  "data","bio","nano","photonic","graph",
]

const TECH_NOUNS: string[] = [
  "security","hardware","software","interface","protocol",
  "architecture","platform","framework","network","system",
]

const TECH_SUFFIXES: string[] = [
  "ics","tech","logy","tronics","engineering","science","systems","sensors"
]

const CANONICAL_TECHS: string[] = [
  "machine learning",
  "deep learning",
  "artificial intelligence",
  "computer vision",
  "natural language processing",
  "quantum computing",
  "hypersonic technology",
]
/* ================== TYPES ================== */

type ValidationResult =
  | { decision: "accept"; technology: string; confidence: number }
  | { decision: "needs_confirmation"; suggestion: string; confidence: number }
  | { decision: "reject" }

/* ================== STRING SIMILARITY ================== */

// Levenshtein distance
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

// Normalized similarity [0,1]
function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - levenshtein(a, b) / maxLen
}

/* ================== HELPERS ================== */

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
  if (q.length < 4) return [null, 0]

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
  const q = query.trim().toLowerCase()

  // 1️⃣ Basic sanity
  if (q.length < 2 || !q.replace(/\s+/g, "").match(/^[a-z]+$/)) {
    return { decision: "reject" }
  }

  // 2️⃣ Abbreviations
  if (ABBREVIATIONS[q]) {
    return {
      decision: "needs_confirmation",
      suggestion: ABBREVIATIONS[q],
      confidence: 0.9,
    }
  }

  const kScore = keywordScore(q)
  const techIntent = kScore > 0 || nounSignal(q) || suffixSignal(q)

  // 3️⃣ Multi-word tech
  if (techIntent && q.split(" ").length >= 2) {
    return {
      decision: "accept",
      technology: q,
      confidence: kScore,
    }
  }

  // 4️⃣ Fuzzy match
 // 4️⃣ Fuzzy match
const [match, sim] = fuzzyMatch(q)

if (sim >= 0.75 && match && match !== q) {
  return {
    decision: "needs_confirmation",
    suggestion: match,
    confidence: sim,
  }
}

// then reject
if (!techIntent) {
  return { decision: "reject" }
}


  // 5️⃣ Single-word tech
  if (techIntent) {
    return {
      decision: "accept",
      technology: q,
      confidence: Math.max(kScore, sim),
    }
  }

  return { decision: "reject" }
}