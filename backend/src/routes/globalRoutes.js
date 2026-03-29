import express from "express";
import {
  getGlobalData,
  getIndiaData,
} from "../controllers/globalController.js";

const router = express.Router();

// Global technology dashboard data
router.get("/", getGlobalData);

// India-specific technology data
router.get("/india", getIndiaData);

export default router;