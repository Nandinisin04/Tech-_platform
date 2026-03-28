import express from "express";
import {
  getTechnologyData,
  runTechnologyPipeline,
} from "../controllers/techController.js";

const router = express.Router();

// Get cached tech data
router.get("/:technology", getTechnologyData);

// Trigger ML pipeline + save to DB
router.post("/:technology/run", runTechnologyPipeline);

export default router;