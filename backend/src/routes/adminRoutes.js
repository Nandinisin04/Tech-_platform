import express from "express";
import {refreshGlobal} from "../jobs/refreshGlobal.js";
import {refreshIndia} from "../jobs/refreshIndia.js";

const router = express.Router();

/* ================= GLOBAL REFRESH ================= */

router.post("/refresh-global", async (req, res) => {
  console.log("⚡ Manual trigger: Global refresh");

  try {
    const result = await refreshGlobal();
    return res.status(200).json(result);
  } catch (error) {
    console.error("❌ Route error (global):", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Global refresh failed",
    });
  }
});

/* ================= INDIA REFRESH ================= */

router.post("/refresh-india", async (req, res) => {
  console.log("⚡ Manual trigger: India refresh");

  try {
    const result = await refreshIndia();
    return res.status(200).json(result);
  } catch (error) {
    console.error("❌ Route error (india):", error);

    return res.status(500).json({
      success: false,
      error: error.message || "India refresh failed",
    });
  }
});

export default router;