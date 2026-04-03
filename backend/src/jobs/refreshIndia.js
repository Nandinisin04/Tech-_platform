import axios from "axios";
import { connectDB } from "../config/db.js";
import { India } from "../models/technology.js";

const ML_BASE_URL = process.env.ML_SERVICE_URL;

export async function refreshIndia() {
  console.log("🇮🇳 [refreshIndia] Starting India refresh");

  await connectDB();

  const doc =
    (await India.findOne({ name: "__india__" })) ??
    new India({ name: "__india__", latest_json: {} });

  try {
    /* ================= PARALLEL CALLS ================= */

    const [pubRes, patRes] = await Promise.all([
      axios.post(`${ML_BASE_URL}/internal/run-india-publications`),
      axios.post(`${ML_BASE_URL}/internal/run-india-patents`),
    ]);

    const publications = pubRes.data.publications;
    const patents = patRes.data.patents;

    /* ================= COMMIT ================= */

    doc.latest_json.india = {
      publications,
      patents,
      generated_at: new Date().toISOString(),
    };

    doc.updated_at = new Date();

    await doc.save();

    console.log("✅ India refresh completed");

    return {
      success: true,
      message: "India data refreshed",
    };

  } catch (error) {
    console.error("❌ India refresh failed:", error.message);

    return {
      success: false,
      error: error.message,
    };
  }
}