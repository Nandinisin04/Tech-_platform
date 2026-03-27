import express from "express";
import {
  getGlobalData,
  getGlobalInvestmentData,
  getIndiaData,
} from "../controllers/globalController.js";

const router = express.Router();

// Global technology dashboard data
router.get("/", getGlobalData);

// Global investment trends
router.get("/investment", getGlobalInvestmentData);

// India-specific technology data
router.get("/india", getIndiaData);

export default router;