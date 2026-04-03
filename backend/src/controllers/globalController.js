import { connectDB } from "../config/db.js";
import { Global, India } from "../models/technology.js";
import { refreshGlobal } from "../jobs/refreshGlobal.js";
import { refreshIndia } from "../jobs/refreshIndia.js";

export const getGlobalData = async (req, res) => {
  try {
    console.log("🌍 getGlobalData called");

    await connectDB();

    let doc = await Global.findOne({ name: "__global__" });

    /* ================= HANDLE EMPTY ================= */

    if (!doc || !doc.latest_json?.global) {
      console.log("⚠️ No global data found. Triggering refresh...");

      await refreshGlobal();

      // 🔥 re-fetch AFTER refresh
      doc = await Global.findOne({ name: "__global__" });

      if (!doc || !doc.latest_json?.global) {
        return res.status(500).json({
          error: "Failed to populate global data",
        });
      }
    }

    /* ================= SAFE ACCESS ================= */

    const { patents, trends, investments } = doc.latest_json.global;

    return res.status(200).json({
      generated_at: {
        patents: patents?.generated_at ?? null,
        trends: trends?.generated_at ?? null,
        investments: investments?.generated_at ?? null,
      },
      counts: {
        patents: patents?.counts ?? patents?.signals?.length ?? 0,
        trends: trends?.counts ?? trends?.signals?.length ?? 0,
        investments:
          investments?.counts ??
          Object.keys(investments?.countries ?? {}).length,
      },
      patents: patents?.signals ?? [],
      trends: trends?.signals ?? [],
      investments: investments?.countries ?? {},
    });

  } catch (error) {
    console.error("❌ Error fetching global data:", error);
    return res.status(500).json({ error: "Failed to fetch global data" });
  }
};


export const getIndiaData = async (req, res) => {
  try {
    console.log("🇮🇳 getIndiaData called");

    await connectDB();

    
    const globalDoc = await Global.findOne({ name: "__global__" });

let indiaDoc = await India.findOne({ name: "__india__" });

if (!indiaDoc?.latest_json?.india) {
  console.log("⚠️ No India data found. Triggering refresh...");

  await refreshIndia();

  indiaDoc = await India.findOne({ name: "__india__" });

  if (!indiaDoc?.latest_json?.india) {
    return res.status(500).json({
      error: "Failed to populate India data",
    });
  }
}

    /* ================= PUBLICATIONS ================= */

    const publicationsRaw = indiaDoc.latest_json.india.publications;

    const publications = publicationsRaw
      ? Object.values(publicationsRaw.fields ?? {}).flatMap((field) =>
          (field.publications || []).map((p) => ({
            title: p.title,
            link: p.link,
            year: p.year ?? 0,
            academic_weight: p.citations ?? 0,
          }))
        )
      : [];

    publications.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return (b.academic_weight ?? 0) - (a.academic_weight ?? 0);
    });

    /* ================= PATENTS ================= */

    const patentsRaw = indiaDoc.latest_json.india.patents;

    const institutes = Object.values(patentsRaw?.institutes ?? {});

    const patents = institutes.flatMap((list) =>
      list.map((p) => ({
        title: p.title,
        link: p.link,
        year: p.year ?? 0,
        institute: p.institute,
        strategic_weight: p.year ? Math.max(1, p.year - 2010) : 1,
      }))
    );

    patents.sort((a, b) => {
      if ((b.year ?? 0) !== (a.year ?? 0)) {
        return (b.year ?? 0) - (a.year ?? 0);
      }
      return (b.strategic_weight ?? 0) - (a.strategic_weight ?? 0);
    });

    /* ================= INVESTMENTS ================= */

    const countries =
      globalDoc?.latest_json?.global?.investments?.countries;

    const india = countries?.india;

    const extractYear = (dateStr) => {
      if (!dateStr) return undefined;
      const match = dateStr.match(/\b(20\d{2})\b/);
      return match ? Number(match[1]) : undefined;
    };

    const investments = india
      ? Object.values(india.technologies ?? {}).flatMap((tech) =>
          (tech.articles || []).map((a) => ({
            title: a.title,
            link: a.link,
            year: extractYear(a.date),
            confidence_weight: a.confidence_weight ?? 0,
            source: a.source,
            date: a.date,
          }))
        )
      : [];

    investments.sort((a, b) => {
      if ((b.year ?? 0) !== (a.year ?? 0)) {
        return (b.year ?? 0) - (a.year ?? 0);
      }
      return (b.confidence_weight ?? 0) - (a.confidence_weight ?? 0);
    });

    /* ================= RESPONSE ================= */

    return res.status(200).json({
      summary: {
        publications: publications.length,
        patents: patents.length,
        investments: investments.length,
      },
      signals: {
        publications,
        patents,
        investments,
      },
    });
  } catch (err) {
    console.error("❌ Error in getIndiaData:", err);
    return res.status(500).json({
      error: "Failed to fetch India data",
    });
  }
};