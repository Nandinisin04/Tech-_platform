import {Technology} from "../models/technology.js";
import axios from "axios";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL;

export const getTechnologyFromDB = async (technology) => {
  const techKey = technology.trim().toLowerCase();

  console.log("🔍 Checking DB for:", techKey);

  const tech = await Technology.findOne({ name: techKey });

  if (!tech) {
    console.log(" Not found in DB:", techKey);
    return null;
  }

  console.log("✅ Found in DB:", tech.name);

  // ALWAYS return ML payload shape to frontend
  if (tech.latest_json) {
    return tech.latest_json;
  }

  // fallback only if old records were saved flat
  return {
    dashboard: {
      name: tech.name,
      category: tech.category || null,
      description: tech.description || null,
      trend_curve: tech.trend_curve || [],
      patent_timeline: tech.patent_timeline || [],
      country_investment: tech.country_investment || { values: {} },
      investment_index: tech.investment_index || { values: {} },
      market_reports: tech.market_reports || [],
      entities: tech.entities || {},
    },
    knowledge_graph: tech.knowledge_graph || { nodes: [], edges: [] },
    alerts: tech.alerts || [],
    source: tech.source || "db",
  };
};

export const generateAndStoreTechnology = async (technology) => {
  const techKey = technology.trim().toLowerCase();

  console.log("🚀 Running ML for:", techKey);

  const response = await axios.post(`${ML_SERVICE_URL}/generate`, {
    technology: techKey,
  });

  const generatedData = response.data?.data || response.data;

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
};