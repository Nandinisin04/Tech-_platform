// src/lib/keyInsightsTooltips.ts

export const KEY_INSIGHTS_TOOLTIPS = {
  "Technology Readiness": {
    meaning:
      "TRL (Technology Readiness Level) tells how mature a technology is.\nFrom concept → real-world deployment.",
  },

  "S-Curve Position": {
    meaning:
      "S-Curve shows where a technology lies in its adoption lifecycle.\nEarly → Growth → Mature stage.",
  },

  "Market Size": {
    meaning:
      "Market Size estimates the total opportunity for this technology.\nShown as TAM (Total Addressable Market).",
  },

  "Tech Convergence": {
    meaning:
      "Tech Convergence shows how strongly this tech overlaps with others.\nMore overlap = more cross-domain use.",
  },
}

// For S-Curve stage values (Plateau / Slope / etc.)
export const STAGE_INFO: Record<string, string> = {
  "Innovation Trigger": "Very early stage — mostly research & experiments.",
  "Peak of Hype": "High attention stage — expectations may be inflated.",
  "Trough of Disillusionment": "Interest drops after hype — real value tested.",
  "Slope of Enlightenment": "Use-cases improve — adoption becomes steady.",
  "Plateau of Productivity": "Mature and reliable — widely adopted & proven.",
  "No Data": "Not enough signals available for classification.",
}

// TRL number meaning
export const TRL_INFO = (trl: number) => {
  if (trl <= 3) return "Value meaning: Early research stage (concept/proof of idea)."
  if (trl <= 6) return "Value meaning: Prototype/testing stage (validation in labs)."
  return "Value meaning: Deployment-ready stage (tested in real environment)."
}

// Market size meaning
export const MARKET_SIZE_INFO = (tam: number | null) => {
  if (tam == null) return "Value meaning: N/A = market sizing data not available."
  if (tam < 1) return "Value meaning: Small/niche market opportunity (< $1B)."
  if (tam < 10) return "Value meaning: Mid-size market opportunity ($1B–$10B)."
  return "Value meaning: Large market opportunity (> $10B)."
}

// Convergence meaning
export const CONVERGENCE_INFO = (signals: number) => {
  if (signals < 10) return "Value meaning: Low overlap (few cross-tech intersections)."
  if (signals < 25) return "Value meaning: Moderate overlap (some cross-domain usage)."
  return "Value meaning: High overlap (strong multi-domain convergence)."
}
