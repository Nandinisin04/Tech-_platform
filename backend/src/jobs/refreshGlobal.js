import axios from "axios";
import { connectDB } from "../config/db.js";
import { Global } from "../models/technology.js";

const ML_BASE_URL = process.env.ML_SERVICE_URL;

export async function refreshGlobal() {
  console.log("🌍 [refreshGlobal] Starting global refresh");

  await connectDB();

  const doc =
    (await Global.findOne({ name: "__global__" })) ??
    new Global({ name: "__global__", latest_json: {} });

  try {
    /* ================= PARALLEL CALLS ================= */

    const [investmentsRes, patentsRes, trendsRes] = await Promise.all([
      axios.post(`${ML_BASE_URL}/internal/run-global-investments`),
      axios.post(`${ML_BASE_URL}/internal/run-global-patents`),
      axios.post(`${ML_BASE_URL}/internal/run-global-trends`),
    ]);

    const investments = investmentsRes.data.investments;
    const patents = patentsRes.data.patents;
    const trends = trendsRes.data.trends;

    /* ================= COMMIT ================= */

    doc.latest_json.global = {
      investments,
      patents,
      trends,
      generated_at: new Date().toISOString(),
    };

    doc.updated_at = new Date();

    await doc.save();

    console.log("✅ Global refresh completed");

    return {
      success: true,
      message: "Global data refreshed",
    };

  } catch (error) {
    console.error("❌ Global refresh failed:", error.message);

    return {
      success: false,
      error: error.message,
    };
  }
}
