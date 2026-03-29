import {Technology} from "../models/technology.js";
import axios from "axios";

/* ================= HELPERS ================= */

function normalizeTechKey(technology) {
  return technology.trim().toLowerCase().replace(/\s+/g, "_");
}

function getMLServiceUrl() {
  const url = process.env.ML_SERVICE_URL;
  console.log("🌐 [getMLServiceUrl] process.env.ML_SERVICE_URL =", url);
  return url;
}

/* ================= DB FETCH ================= */

export const getTechnologyFromDB = async (technology) => {
  const techKey = normalizeTechKey(technology);

  console.log("🔍 Checking DB for:", techKey);

  const tech = await Technology.findOne({ name: techKey });

  if (!tech) {
    console.log("❌ Not found in DB:", techKey);
    return null;
  }

  console.log("✅ Found in DB:", tech.name);

  if (tech.latest_json) {
    console.log("📦 Returning latest_json for:", tech.name);
    return tech.latest_json;
  }

  console.log("⚠️ Returning fallback flattened DB record for:", tech.name);

  return {
    dashboard: {
      name: tech.name,
      category: tech.category || null,
      description: tech.description || null,
      trend_curve: tech.trend_curve || tech.adoption_curve || [],
      adoption_curve: tech.adoption_curve || tech.trend_curve || [],
      patent_timeline: tech.patent_timeline || [],
      paper_timeline: tech.paper_timeline || [],
      country_investment: tech.country_investment || { values: {} },
      investment_index: tech.investment_index || { values: {} },
      market_reports: tech.market_reports || [],
      market_timeline: tech.market_timeline || [],
      entities: tech.entities || {},
    },
    knowledge_graph: tech.knowledge_graph || { nodes: [], edges: [] },
    alerts: tech.alerts || [],
    source: tech.source || "db",
  };
};

/* ================= ML GENERATION ================= */

export const generateAndStoreTechnology = async (technology) => {
  const techKey = normalizeTechKey(technology);
  const ML_SERVICE_URL = getMLServiceUrl();

  console.log("🚀 Running ML for:", techKey);
  console.log("🌐 ML_SERVICE_URL:", ML_SERVICE_URL);

  if (!ML_SERVICE_URL) {
    throw new Error("ML_SERVICE_URL is not defined in environment variables");
  }

  try {
    const response = await axios.post(`${ML_SERVICE_URL}/generate`, {
      technology: techKey,
    });

    console.log("✅ ML response received for:", techKey);
    console.log("📦 ML raw response:", response.data);

    const generatedData = response.data?.data || response.data;

    if (!generatedData || typeof generatedData !== "object") {
      throw new Error("Invalid ML response: empty or malformed payload");
    }

    const savedDoc = await Technology.findOneAndUpdate(
      { name: techKey },
      {
        name: techKey,
        latest_json: generatedData,
        updated_at: new Date(),
        source: "ml-generated",
        last_error: null,
      },
      { upsert: true, new: true }
    );

    console.log("💾 Saved to MongoDB:", savedDoc?.name);

    return generatedData;
  } catch (error) {
    console.error("❌ ML pipeline failed for:", techKey);

    if (error.response) {
      console.error("❌ ML service status:", error.response.status);
      console.error("❌ ML service data:", error.response.data);
    } else {
      console.error("❌ ML service error:", error.message);
    }

    await Technology.findOneAndUpdate(
      { name: techKey },
      {
        name: techKey,
        updated_at: new Date(),
        source: "ml-failed",
        last_error: error.message,
      },
      { upsert: true, new: true }
    );

    throw error;
  }
};